import type { Database, SqlParam } from '../../db/client.js';
import { toLikePattern } from '../../shared/pagination.js';
import type { Video, VideoListQuery } from './videos.schema.js';

interface VideoRow {
  id: number;
  title: string;
  url: string;
  cover_url: string | null;
  published_at: string;
  duration_seconds: number;
}

const sortColumns: Record<VideoListQuery['sort'], string> = {
  publishedAt: 'published_at',
  duration: 'duration_seconds',
  title: 'title',
};

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

export function toVideoDto(row: VideoRow): Video {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    coverUrl: row.cover_url,
    publishedAt: row.published_at,
    durationSeconds: row.duration_seconds,
    durationLabel: formatDuration(row.duration_seconds),
  };
}

function buildFilter(query: VideoListQuery): { where: string; params: SqlParam[] } {
  const clauses: string[] = [];
  const params: SqlParam[] = [];

  if (query.q) {
    clauses.push("title LIKE ? ESCAPE '\\'");
    params.push(toLikePattern(query.q));
  }
  if (query.year) {
    clauses.push('substr(published_at, 1, 4) = ?');
    params.push(String(query.year));
  }

  return { where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export function listVideos(
  db: Database,
  query: VideoListQuery,
): { rows: Video[]; total: number } {
  const { where, params } = buildFilter(query);
  const direction = query.order === 'asc' ? 'ASC' : 'DESC';
  const sortColumn = sortColumns[query.sort];

  const total = Number(
    db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM videos ${where}`, params)?.total ?? 0,
  );

  const rows = db.all<VideoRow>(
    `SELECT id, title, url, cover_url, published_at, duration_seconds
       FROM videos
       ${where}
       ORDER BY ${sortColumn} ${direction}, id DESC
       LIMIT ? OFFSET ?`,
    [...params, query.pageSize, (query.page - 1) * query.pageSize],
  );

  return { rows: rows.map(toVideoDto), total };
}

export function listLatestVideos(db: Database, limit: number): Video[] {
  return db
    .all<VideoRow>(
      `SELECT id, title, url, cover_url, published_at, duration_seconds
         FROM videos
         ORDER BY published_at DESC
         LIMIT ?`,
      [limit],
    )
    .map(toVideoDto);
}

export function listVideoYears(db: Database): number[] {
  return db
    .all<{ year: string }>(
      `SELECT DISTINCT substr(published_at, 1, 4) AS year FROM videos ORDER BY year DESC`,
    )
    .map((row) => Number(row.year));
}
