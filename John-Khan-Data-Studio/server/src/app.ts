import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Database } from './db/client.js';
import { env } from './config/env.js';
import { logger } from './logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createVideosRouter } from './modules/videos/videos.router.js';
import { createSignsRouter } from './modules/signs/signs.router.js';
import { createAvatarsRouter } from './modules/avatars/avatars.router.js';
import { createStatsRouter } from './modules/stats/stats.router.js';

export interface CreateAppOptions {
  db: Database;
  /** 前端构建产物目录；存在时由同一个服务托管 SPA。 */
  webDist?: string;
  corsOrigins?: string[];
  httpLogging?: boolean;
}

export function createApp({ db, webDist = env.webDist, corsOrigins = env.corsOrigins, httpLogging = true }: CreateAppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          'default-src': ["'self'"],
          'img-src': ["'self'", 'data:', 'https:', 'http:'],
          'style-src': ["'self'", "'unsafe-inline'"],
          'script-src': ["'self'"],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'frame-ancestors': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(compression());

  if (httpLogging) {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req: IncomingMessage) => !req.url?.startsWith('/api') || req.url === '/api/health' },
        customLogLevel: (_req: IncomingMessage, res: ServerResponse, error?: Error) => {
          if (error || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        // 只保留排查问题需要的信息，避免把整份请求头写进日志。
        serializers: {
          req: (req: IncomingMessage) => ({ method: req.method, url: req.url }),
          res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
        },
      }),
    );
  }

  // 浏览器对 modulepreload / 字体等请求会带上 Origin（即使同源），
  // 因此这里同时放行「同源」与显式配置的来源。
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isSameOrigin = (() => {
      if (!origin) return true;
      try {
        return new URL(origin).host === req.headers.host;
      } catch {
        return false;
      }
    })();

    const allowed = isSameOrigin || corsOrigins.includes('*') || (origin ? corsOrigins.includes(origin) : false);

    cors({
      origin: allowed ? origin ?? true : false,
      maxAge: 86_400,
    })(req, res, next);
  });

  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    const healthy = db.ping();
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      time: new Date().toISOString(),
      database: healthy ? 'ok' : 'unavailable',
    });
  });

  app.use('/api/videos', createVideosRouter(db));
  app.use('/api/signs', createSignsRouter(db));
  app.use('/api/avatars', createAvatarsRouter(db));
  app.use('/api/stats', createStatsRouter(db));
  app.use('/api', notFoundHandler);

  const indexHtml = path.join(webDist, 'index.html');
  const hasFrontend = fs.existsSync(indexHtml);

  // 头像直接从源目录提供：Python 新增头像后无需重新构建前端即可访问。
  app.use(
    '/images',
    express.static(env.avatarDir, {
      maxAge: '30d',
      immutable: true,
    }),
  );
  // 图片缺失时返回 404，避免落到 SPA 兜底返回 HTML。
  app.use('/images', (_req, res) => {
    res.status(404).type('text/plain; charset=utf-8').send('头像不存在');
  });

  if (hasFrontend) {
    app.use(
      express.static(webDist, {
        index: false,
        maxAge: '7d',
        setHeaders(res, filePath) {
          if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  }

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      notFoundHandler(req, res, () => undefined);
      return;
    }
    res
      .status(503)
      .type('text/plain; charset=utf-8')
      .send('前端尚未构建。请先在项目根目录运行 `npm run build`，或使用 `npm run dev` 启动开发服务器。');
  });

  app.use(errorHandler);

  return app;
}
