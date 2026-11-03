import { z } from 'zod';
import { listQueryBase } from '../../shared/pagination.js';

export const signListQuerySchema = listQueryBase.extend({
  /** 只看有内容的签名（原始数据里有若干空签名）。 */
  withContent: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type SignListQuery = z.infer<typeof signListQuerySchema>;

export interface Sign {
  id: number;
  content: string | null;
  postedAt: string;
}
