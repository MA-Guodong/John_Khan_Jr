import { z } from 'zod';
import { listQueryBase } from '../../shared/pagination.js';

export const videoSortFields = ['publishedAt', 'duration', 'title'] as const;
export type VideoSortField = (typeof videoSortFields)[number];

export const videoListQuerySchema = listQueryBase.extend({
  sort: z.enum(videoSortFields).default('publishedAt'),
});

export type VideoListQuery = z.infer<typeof videoListQuerySchema>;

export interface Video {
  id: number;
  title: string;
  url: string;
  coverUrl: string | null;
  publishedAt: string;
  durationSeconds: number;
  durationLabel: string;
}
