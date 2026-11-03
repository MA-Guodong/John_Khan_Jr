import type { Database } from '../../db/client.js';

export interface DateRange {
  firstAt: string | null;
  lastAt: string | null;
  total: number;
}

type TableName = 'videos' | 'signs' | 'avatars';

function dateColumn(table: TableName): string {
  return table === 'videos' ? 'published_at' : 'posted_at';
}

export function getDateRange(db: Database, table: TableName): DateRange {
  const column = dateColumn(table);
  const row = db.get<{ firstAt: string | null; lastAt: string | null; total: number }>(
    `SELECT MIN(${column}) AS firstAt, MAX(${column}) AS lastAt, COUNT(*) AS total FROM ${table}`,
  );

  return {
    firstAt: row?.firstAt ?? null,
    lastAt: row?.lastAt ?? null,
    total: Number(row?.total ?? 0),
  };
}

export function countEmptySigns(db: Database): number {
  return Number(db.get<{ total: number }>('SELECT COUNT(*) AS total FROM signs WHERE content IS NULL')?.total ?? 0);
}

export function groupByMonth(db: Database, table: TableName): Map<string, number> {
  const column = dateColumn(table);
  const rows = db.all<{ month: string; count: number }>(
    `SELECT substr(${column}, 1, 7) AS month, COUNT(*) AS count
       FROM ${table}
       GROUP BY month`,
  );
  return new Map(rows.map((row) => [row.month, Number(row.count)]));
}

export function groupByWeekday(db: Database, table: 'videos' | 'signs'): Map<number, number> {
  const column = dateColumn(table);
  const rows = db.all<{ dow: number; count: number }>(
    `SELECT CAST(strftime('%w', ${column}) AS INTEGER) AS dow, COUNT(*) AS count
       FROM ${table}
       GROUP BY dow`,
  );
  return new Map(rows.map((row) => [Number(row.dow), Number(row.count)]));
}

export function groupByHourWeekday(db: Database): Map<string, number> {
  const rows = db.all<{ dow: number; hour: number; count: number }>(
    `SELECT CAST(strftime('%w', posted_at) AS INTEGER) AS dow,
            CAST(strftime('%H', posted_at) AS INTEGER) AS hour,
            COUNT(*) AS count
       FROM signs
       GROUP BY dow, hour`,
  );
  return new Map(rows.map((row) => [`${row.dow}-${row.hour}`, Number(row.count)]));
}

export function groupByYear(db: Database, table: TableName): Map<string, number> {
  const column = dateColumn(table);
  const rows = db.all<{ year: string; count: number }>(
    `SELECT substr(${column}, 1, 4) AS year, COUNT(*) AS count
       FROM ${table}
       GROUP BY year
       ORDER BY year`,
  );
  return new Map(rows.map((row) => [row.year, Number(row.count)]));
}

export function listVideoTimeline(db: Database): { publishedAt: string; durationSeconds: number }[] {
  return db.all<{ publishedAt: string; durationSeconds: number }>(
    `SELECT published_at AS publishedAt, duration_seconds AS durationSeconds
       FROM videos
       ORDER BY published_at ASC`,
  );
}
