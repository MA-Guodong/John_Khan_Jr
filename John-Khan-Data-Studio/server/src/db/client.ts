import fs from 'node:fs';
import path from 'node:path';
import BetterSqlite3 from 'better-sqlite3';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';

export type SqlParam = string | number | bigint | null | Uint8Array;

/**
 * 对 better-sqlite3 的薄封装：只暴露参数化查询与事务。
 *
 * 使用原生 SQLite 而不是 WASM 版本，是为了让 Python 爬虫脚本
 * 可以用标准的 sqlite3 模块同时读写同一个文件（WAL 模式下读写互不阻塞）。
 * 所有 SQL 都走占位符，杜绝拼接注入。
 */
export class Database {
  private readonly db: BetterSqlite3Database;

  constructor(filename: string) {
    if (filename !== ':memory:') {
      fs.mkdirSync(path.dirname(filename), { recursive: true });
    }

    this.db = new BetterSqlite3(filename);

    // WAL 允许「一个写入者 + 多个读取者」并发；busy_timeout 避免瞬时锁冲突。
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
  }

  all<T>(sql: string, params: SqlParam[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  get<T>(sql: string, params: SqlParam[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  run(sql: string, params: SqlParam[] = []): { changes: number; lastInsertRowid: number | bigint } {
    return this.db.prepare(sql).run(...params);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  transaction<T>(work: () => T): T {
    return this.db.transaction(work)();
  }

  ping(): boolean {
    try {
      return this.get<{ ok: number }>('SELECT 1 AS ok')?.ok === 1;
    } catch {
      return false;
    }
  }

  close(): void {
    this.db.close();
  }
}

export function createDatabase(filename: string): Database {
  return new Database(filename);
}
