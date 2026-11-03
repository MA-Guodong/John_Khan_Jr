import { z } from 'zod';
import { listQueryBase } from '../../shared/pagination.js';
export const videoSortFields = ['publishedAt', 'duration', 'title'];
export const videoListQuerySchema = listQueryBase.extend({
    sort: z.enum(videoSortFields).default('publishedAt'),
});
//# sourceMappingURL=videos.schema.js.map