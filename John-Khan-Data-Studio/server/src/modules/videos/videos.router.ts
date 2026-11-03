import { Router } from 'express';
import type { Database } from '../../db/client.js';
import { buildPageMeta } from '../../shared/pagination.js';
import { cacheControl } from '../../middleware/cache.js';
import { listVideos } from './videos.repository.js';
import { videoListQuerySchema } from './videos.schema.js';

export function createVideosRouter(db: Database): Router {
  const router = Router();

  router.get('/', cacheControl(30), (req, res) => {
    const query = videoListQuerySchema.parse(req.query);
    const { rows, total } = listVideos(db, query);
    res.json({ data: rows, meta: buildPageMeta(query.page, query.pageSize, total) });
  });

  return router;
}
