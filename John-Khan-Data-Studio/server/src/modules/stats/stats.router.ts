import { Router } from 'express';
import type { Database } from '../../db/client.js';
import { cacheControl } from '../../middleware/cache.js';
import { listAvatarYears } from '../avatars/avatars.repository.js';
import { listSignYears } from '../signs/signs.repository.js';
import { listVideoYears } from '../videos/videos.repository.js';
import { getOverview } from './stats.service.js';

export function createStatsRouter(db: Database): Router {
  const router = Router();

  router.get('/overview', cacheControl(60), (_req, res) => {
    res.json(getOverview(db));
  });

  router.get('/filters', cacheControl(300), (_req, res) => {
    res.json({
      data: {
        years: {
          videos: listVideoYears(db),
          signs: listSignYears(db),
          avatars: listAvatarYears(db),
        },
      },
    });
  });

  return router;
}
