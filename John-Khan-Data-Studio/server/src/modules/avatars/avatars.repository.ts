import type { Database, SqlParam } from '../../db/client.js';
import type { Avatar, AvatarListQuery } from './avatars.schema.js';

interface AvatarRow {
  id: number;
  image_file: string;
  posted_at: string;
}

function toDto(row: AvatarRow): Avatar {
  return {
    id: row.id,
    imageFile: row.image_file,
    imageUrl: `/images/${encodeURIComponent(row.image_file)}`,
    postedAt: row.posted_at,
  };
}

export function listAvatars(db: Database, query: AvatarListQuery): { rows: Avatar[]; total: number } {
  const clauses: string[] = [];
  const params: SqlParam[] = [];

  if (query.year) {
    clauses.push('substr(posted_at, 1, 4) = ?');
    params.push(String(query.year));
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const direction = query.order === 'asc' ? 'ASC' : 'DESC';

  const total = Number(
    db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM avatars ${where}`, params)?.total ?? 0,
  );

  const rows = db.all<AvatarRow>(
    `SELECT id, image_file, posted_at
       FROM avatars
       ${where}
       ORDER BY posted_at ${direction}, id DESC
       LIMIT ? OFFSET ?`,
    [...params, query.pageSize, (query.page - 1) * query.pageSize],
  );

  return { rows: rows.map(toDto), total };
}

export function listLatestAvatars(db: Database, limit: number): Avatar[] {
  return db
    .all<AvatarRow>(
      `SELECT id, image_file, posted_at FROM avatars ORDER BY posted_at DESC LIMIT ?`,
      [limit],
    )
    .map(toDto);
}

export function listAvatarYears(db: Database): number[] {
  return db
    .all<{ year: string }>(
      `SELECT DISTINCT substr(posted_at, 1, 4) AS year FROM avatars ORDER BY year DESC`,
    )
    .map((row) => Number(row.year));
}
