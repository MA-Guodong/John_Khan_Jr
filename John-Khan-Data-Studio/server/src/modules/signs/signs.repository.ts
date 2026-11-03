import type { Database, SqlParam } from '../../db/client.js';
import { toLikePattern } from '../../shared/pagination.js';
import type { Sign, SignListQuery } from './signs.schema.js';

interface SignRow {
  id: number;
  content: string | null;
  posted_at: string;
}

function toDto(row: SignRow): Sign {
  return { id: row.id, content: row.content, postedAt: row.posted_at };
}

function buildFilter(query: SignListQuery): { where: string; params: SqlParam[] } {
  const clauses: string[] = [];
  const params: SqlParam[] = [];

  if (query.q) {
    clauses.push("content LIKE ? ESCAPE '\\'");
    params.push(toLikePattern(query.q));
  }
  if (query.year) {
    clauses.push('substr(posted_at, 1, 4) = ?');
    params.push(String(query.year));
  }
  if (query.withContent) {
    clauses.push('content IS NOT NULL');
  }

  return { where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export function listSigns(db: Database, query: SignListQuery): { rows: Sign[]; total: number } {
  const { where, params } = buildFilter(query);
  const direction = query.order === 'asc' ? 'ASC' : 'DESC';

  const total = Number(
    db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM signs ${where}`, params)?.total ?? 0,
  );

  const rows = db.all<SignRow>(
    `SELECT id, content, posted_at
       FROM signs
       ${where}
       ORDER BY posted_at ${direction}, id DESC
       LIMIT ? OFFSET ?`,
    [...params, query.pageSize, (query.page - 1) * query.pageSize],
  );

  return { rows: rows.map(toDto), total };
}

export function listLatestSigns(db: Database, limit: number): Sign[] {
  return db
    .all<SignRow>(
      `SELECT id, content, posted_at FROM signs ORDER BY posted_at DESC LIMIT ?`,
      [limit],
    )
    .map(toDto);
}

export function findRandomSign(db: Database): Sign | null {
  const row = db.get<SignRow>(
    `SELECT id, content, posted_at FROM signs WHERE content IS NOT NULL ORDER BY RANDOM() LIMIT 1`,
  );
  return row ? toDto(row) : null;
}

export function listSignYears(db: Database): number[] {
  return db
    .all<{ year: string }>(
      `SELECT DISTINCT substr(posted_at, 1, 4) AS year FROM signs ORDER BY year DESC`,
    )
    .map((row) => Number(row.year));
}
