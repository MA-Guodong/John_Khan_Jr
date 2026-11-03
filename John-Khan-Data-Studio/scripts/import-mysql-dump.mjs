/**
 * 把 MySQL dump 解析为站点使用的种子 JSON。
 *
 * 兼容两种 dump：
 *   1. 旧版：INSERT INTO `video` VALUES (...);（无列名，latin1/UTF-8 混用，需要修复乱码）
 *   2. 新版：INSERT INTO `video` (`id`, `video_title`, ...) VALUES (...);（UTF-8，列名齐全）
 *
 * 用法：
 *   node scripts/import-mysql-dump.mjs [dump.sql] [--out dir] [--no-repair]
 *
 * 输出：data/seed/videos.json、signs.json、avatars.json、meta.json
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const iconv = require('iconv-lite');

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((item) => item.startsWith('--')));
const dumpArg = argv.find((item) => !item.startsWith('--'));

const outIndex = argv.indexOf('--out');
const outArg = outIndex >= 0 ? argv[outIndex + 1] : null;
const seedDir = path.resolve(outArg ?? path.join(rootDir, 'data', 'seed'));
const imagesDir = path.join(rootDir, 'web', 'public', 'images');
const repairEnabled = !flags.has('--no-repair');

const defaultTables = {
  video: ['id', 'video_title', 'video_url', 'video_cover', 'release_time', 'video_duration'],
  Sign: ['id', 'sign_time', 'sign'],
  Avatar: ['id', 'avatar_time', 'img_file_path'],
  Charts: ['id', 'chart_month', 'count', 'type'],
};

const dumpCandidates = [
  dumpArg,
  path.join(rootDir, 'data', 'legacy', 'khan.sql'),
  path.join(rootDir, 'data', 'legacy', 'khan_2024-01-27_02-30-02_mysql_data.sql'),
  path.join(rootDir, '..', 'khan.sql'),
  path.join(rootDir, '..', 'khan_2024-01-27_02-30-02_mysql_data.sql'),
].filter(Boolean);

const dumpPath = dumpCandidates.find((candidate) => existsSync(candidate));
if (!dumpPath) {
  console.error('找不到 dump 文件。请把 .sql 放到 data/legacy/ 或通过参数传入。');
  process.exit(1);
}

const sql = readFileSync(dumpPath, 'utf8');

/** 解析一个 INSERT 语句的 VALUES 部分，返回行数组与结束位置。 */
function parseValues(text, start) {
  const rows = [];
  let row = null;
  let field = '';
  let quoted = false;
  let inString = false;
  let index = start;

  const pushField = () => {
    if (row === null) return;
    const value = quoted ? field : field.trim();
    row.push(!quoted && value.toUpperCase() === 'NULL' ? null : value);
    field = '';
    quoted = false;
  };

  const pushRow = () => {
    pushField();
    if (row) rows.push(row);
    row = null;
  };

  for (; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (char === '\\') {
        const next = text[index + 1];
        const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', 0: '\0', Z: '\x1a' };
        field += escapes[next] ?? next;
        index += 1;
      } else if (char === "'" && text[index + 1] === "'") {
        field += "'";
        index += 1;
      } else if (char === "'") {
        inString = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "'") {
      inString = true;
      quoted = true;
      continue;
    }
    if (char === '(') {
      row = [];
      field = '';
      quoted = false;
      continue;
    }
    if (char === ',') {
      pushField();
      continue;
    }
    if (char === ')') {
      pushRow();
      continue;
    }
    if (char === ';') break;
    if (char === ' ' || char === '\n' || char === '\r' || char === '\t') continue;
    field += char;
  }

  return { rows, end: index + 1 };
}

function parseTable(table) {
  const statements = [];
  const pattern = new RegExp(`INSERT INTO \`${table}\`\\s*(\\([^)]*\\))?\\s*VALUES`, 'g');
  let match;

  while ((match = pattern.exec(sql)) !== null) {
    const columns = match[1]
      ? [...match[1].matchAll(/`([^`]+)`/g)].map((item) => item[1])
      : defaultTables[table] ?? [];

    const { rows, end } = parseValues(sql, pattern.lastIndex);
    statements.push({ columns, rows });
    pattern.lastIndex = end;
  }

  return statements;
}

function rowsToObjects(table) {
  return parseTable(table).flatMap(({ columns, rows }) =>
    rows.map((values) => Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null]))),
  );
}

const cjkCount = (value) => (value.match(/[\u4e00-\u9fff]/g) ?? []).length;
const badMarkerCount = (value) => ['涓', '锛', '鍙', '鎴', '鐨', '銆', '鈥', '\ufffd'].reduce((sum, marker) => sum + value.split(marker).length - 1, 0);

function score(value) {
  return cjkCount(value) * 2 - badMarkerCount(value) * 3;
}

/** 仅在确实更「像正常中文」时才替换，避免把本来就是正常的中文改坏。 */
function repairMojibake(value) {
  if (!repairEnabled || typeof value !== 'string' || value === '') return value;
  let best = value;
  let bestScore = score(value);

  for (const encoding of ['gbk', 'latin1', 'cp1252']) {
    try {
      const candidate = iconv.decode(iconv.encode(value, encoding), 'utf8');
      if (!candidate || candidate.includes('\ufffd')) continue;
      const candidateScore = score(candidate);
      if (candidateScore > bestScore) {
        best = candidate;
        bestScore = candidateScore;
      }
    } catch {
      // 编码不支持（例如 emoji 不在 GBK 中），保留原值。
    }
  }
  return best;
}

function parseDuration(value) {
  if (value === null || value === undefined) return 0;
  const text = String(value).trim();
  if (!text) return 0;
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);

  const parts = text.split(':').map((part) => Number.parseInt(part, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

function normalizeDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : null;
}

function normalizeCover(value) {
  if (!value) return null;
  return String(value).trim().replace(/^http:/, 'https:') || null;
}

function normalizeFilename(value) {
  if (!value) return null;
  const text = String(value).trim().replace(/\\/g, '/').split('?')[0];
  return text.split('/').filter(Boolean).pop() || null;
}

const videoRows = rowsToObjects('video');
const signRows = rowsToObjects('Sign');
const avatarRows = rowsToObjects('Avatar');
const chartRows = rowsToObjects('Charts');

const videos = videoRows
  .map((row) => {
    const title = repairMojibake(row.video_title ?? row.title);
    const publishedAt = normalizeDate(row.release_time ?? row.published_at);
    if (!row.id || !title || !publishedAt) return null;
    return {
      id: Number(row.id),
      title: String(title).trim(),
      url: String(row.video_url ?? row.url ?? '').trim(),
      coverUrl: normalizeCover(row.video_cover ?? row.cover_url),
      publishedAt,
      durationSeconds: parseDuration(row.video_duration ?? row.duration),
    };
  })
  .filter(Boolean);

const signs = signRows
  .map((row) => {
    const postedAt = normalizeDate(row.sign_time ?? row.posted_at);
    if (!row.id || !postedAt) return null;
    const content = repairMojibake(row.sign ?? row.content);
    return {
      id: Number(row.id),
      content: content && String(content).trim() ? String(content).trim() : null,
      postedAt,
    };
  })
  .filter(Boolean);

const avatars = avatarRows
  .map((row) => {
    const postedAt = normalizeDate(row.avatar_time ?? row.posted_at);
    const filename = normalizeFilename(repairMojibake(row.img_file_path ?? row.image_file));
    if (!row.id || !postedAt || !filename) return null;
    return { id: Number(row.id), imageFile: filename, postedAt };
  })
  .filter(Boolean);

videos.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
signs.sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));
avatars.sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));

const duplicateVideoUrls = [...new Set(
  videos
    .map((video) => video.url)
    .filter((url, index, list) => url && list.indexOf(url) !== index),
)];

const imageFiles = new Set(existsSync(imagesDir) ? readdirSync(imagesDir) : []);
const missingImages = avatars.map((avatar) => avatar.imageFile).filter((file) => !imageFiles.has(file));

mkdirSync(seedDir, { recursive: true });
writeFileSync(path.join(seedDir, 'videos.json'), JSON.stringify(videos, null, 2));
writeFileSync(path.join(seedDir, 'signs.json'), JSON.stringify(signs, null, 2));
writeFileSync(path.join(seedDir, 'avatars.json'), JSON.stringify(avatars, null, 2));

const meta = {
  source: path.basename(dumpPath),
  importedAt: new Date().toISOString(),
  repairedMojibake: repairEnabled,
  counts: { videos: videos.length, signs: signs.length, avatars: avatars.length },
  ignored: { charts: chartRows.length },
  duplicateVideoUrls,
  missingAvatarImages: missingImages,
};
writeFileSync(path.join(seedDir, 'meta.json'), JSON.stringify(meta, null, 2));

const range = (rows, key) => {
  if (rows.length === 0) return null;
  const sorted = rows.map((row) => row[key]).sort();
  return { first: sorted[0], last: sorted[sorted.length - 1] };
};

console.log(`来源：${dumpPath}`);
console.log(`视频 ${videos.length} 条 ${JSON.stringify(range(videos, 'publishedAt'))}`);
console.log(`签名 ${signs.length} 条 ${JSON.stringify(range(signs, 'postedAt'))}`);
console.log(`头像 ${avatars.length} 条 ${JSON.stringify(range(avatars, 'postedAt'))}`);
console.log(`Charts 表 ${chartRows.length} 条（已忽略，图表由 SQL 实时聚合）`);
console.log(`示例标题：${videos[0]?.title ?? '—'}`);
if (duplicateVideoUrls.length) console.log(`重复视频 URL ${duplicateVideoUrls.length} 个`);
console.log(`头像图片缺失 ${missingImages.length} 个${missingImages.length ? `（例如 ${missingImages.slice(0, 3).join(', ')}）` : ''}`);
console.log(`输出目录：${seedDir}`);
