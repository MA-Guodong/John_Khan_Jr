import { toLikePattern } from '../../shared/pagination.js';
function toDto(row) {
    return { id: row.id, content: row.content, postedAt: row.posted_at };
}
function buildFilter(query) {
    const clauses = [];
    const params = [];
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
export function listSigns(db, query) {
    const { where, params } = buildFilter(query);
    const direction = query.order === 'asc' ? 'ASC' : 'DESC';
    const total = Number(db.get(`SELECT COUNT(*) AS total FROM signs ${where}`, params)?.total ?? 0);
    const rows = db.all(`SELECT id, content, posted_at
       FROM signs
       ${where}
       ORDER BY posted_at ${direction}, id DESC
       LIMIT ? OFFSET ?`, [...params, query.pageSize, (query.page - 1) * query.pageSize]);
    return { rows: rows.map(toDto), total };
}
export function listLatestSigns(db, limit) {
    return db
        .all(`SELECT id, content, posted_at FROM signs ORDER BY posted_at DESC LIMIT ?`, [limit])
        .map(toDto);
}
export function findRandomSign(db) {
    const row = db.get(`SELECT id, content, posted_at FROM signs WHERE content IS NOT NULL ORDER BY RANDOM() LIMIT 1`);
    return row ? toDto(row) : null;
}
export function listSignYears(db) {
    return db
        .all(`SELECT DISTINCT substr(posted_at, 1, 4) AS year FROM signs ORDER BY year DESC`)
        .map((row) => Number(row.year));
}
//# sourceMappingURL=signs.repository.js.map