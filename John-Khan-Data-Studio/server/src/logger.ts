import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { env } from './config/env.js';

function createLogger() {
  if (env.NODE_ENV === 'test') return pino({ level: 'silent' });

  if (!env.isProduction) {
    try {
      return pino({
        level: env.LOG_LEVEL,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      });
    } catch {
      // pino-pretty 不可用时退回普通输出。
    }
  }

  return pino({ level: env.LOG_LEVEL });
}

export const logger = createLogger();

export function ensureDirForFile(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
