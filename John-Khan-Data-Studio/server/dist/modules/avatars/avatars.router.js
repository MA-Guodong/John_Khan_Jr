import { Router } from 'express';
import { buildPageMeta } from '../../shared/pagination.js';
import { cacheControl } from '../../middleware/cache.js';
import { listAvatars } from './avatars.repository.js';
import { avatarListQuerySchema } from './avatars.schema.js';
export function createAvatarsRouter(db) {
    const router = Router();
    router.get('/', cacheControl(30), (req, res) => {
        const query = avatarListQuerySchema.parse(req.query);
        const { rows, total } = listAvatars(db, query);
        res.json({ data: rows, meta: buildPageMeta(query.page, query.pageSize, total) });
    });
    return router;
}
//# sourceMappingURL=avatars.router.js.map