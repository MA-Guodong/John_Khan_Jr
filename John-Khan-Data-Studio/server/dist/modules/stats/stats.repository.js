function dateColumn(table) {
    return table === 'videos' ? 'published_at' : 'posted_at';
}
export function getDateRange(db, table) {
    const column = dateColumn(table);
    const row = db.get(`SELECT MIN(${column}) AS firstAt, MAX(${column}) AS lastAt, COUNT(*) AS total FROM ${table}`);
    return {
        firstAt: row?.firstAt ?? null,
        lastAt: row?.lastAt ?? null,
        total: Number(row?.total ?? 0),
    };
}
export function countEmptySigns(db) {
    return Number(db.get('SELECT COUNT(*) AS total FROM signs WHERE content IS NULL')?.total ?? 0);
}
export function groupByMonth(db, table) {
    const column = dateColumn(table);
    const rows = db.all(`SELECT substr(${column}, 1, 7) AS month, COUNT(*) AS count
       FROM ${table}
       GROUP BY month`);
    return new Map(rows.map((row) => [row.month, Number(row.count)]));
}
export function groupByWeekday(db, table) {
    const column = dateColumn(table);
    const rows = db.all(`SELECT CAST(strftime('%w', ${column}) AS INTEGER) AS dow, COUNT(*) AS count
       FROM ${table}
       GROUP BY dow`);
    return new Map(rows.map((row) => [Number(row.dow), Number(row.count)]));
}
export function groupByHourWeekday(db) {
    const rows = db.all(`SELECT CAST(strftime('%w', posted_at) AS INTEGER) AS dow,
            CAST(strftime('%H', posted_at) AS INTEGER) AS hour,
            COUNT(*) AS count
       FROM signs
       GROUP BY dow, hour`);
    return new Map(rows.map((row) => [`${row.dow}-${row.hour}`, Number(row.count)]));
}
export function groupByYear(db, table) {
    const column = dateColumn(table);
    const rows = db.all(`SELECT substr(${column}, 1, 4) AS year, COUNT(*) AS count
       FROM ${table}
       GROUP BY year
       ORDER BY year`);
    return new Map(rows.map((row) => [row.year, Number(row.count)]));
}
export function listVideoTimeline(db) {
    return db.all(`SELECT published_at AS publishedAt, duration_seconds AS durationSeconds
       FROM videos
       ORDER BY published_at ASC`);
}
//# sourceMappingURL=stats.repository.js.map