import { Router } from 'express';
import type { Database } from '../../db/client.js';
import { buildPageMeta } from '../../shared/pagination.js';
import { cacheControl } from '../../middleware/cache.js';
import { findRandomSign, listSigns } from './signs.repository.js';
import { signListQuerySchema } from './signs.schema.js';

export function createSignsRouter(db: Database): Router {
  const router = Router();

  router.get('/random', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: findRandomSign(db) });
  });

  router.get('/', cacheControl(30), (req, res) => {
    const query = signListQuerySchema.parse(req.query);
    const { rows, total } = listSigns(db, query);
    res.json({ data: rows, meta: buildPageMeta(query.page, query.pageSize, total) });
  });

  return router;
}
