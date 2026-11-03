import { z } from 'zod';
import { listQueryBase } from '../../shared/pagination.js';

export const avatarListQuerySchema = listQueryBase;
export type AvatarListQuery = z.infer<typeof avatarListQuerySchema>;

export interface Avatar {
  id: number;
  imageFile: string;
  imageUrl: string;
  postedAt: string;
}
