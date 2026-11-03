/**
 * Windows 上 esbuild 偶尔会因系统临时目录权限导致 "Access is denied"，
 * 这里把 TEMP/TMP 指向项目内的 .cache 目录，再调用 Vite 的构建 API。
 * 对 Linux / macOS 同样适用，只是多一个被忽略的缓存目录。
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptsDir, '..', 'web');
const tempDir = path.join(webDir, '.cache', 'esbuild');

mkdirSync(tempDir, { recursive: true });
process.env.TEMP = tempDir;
process.env.TMP = tempDir;
process.chdir(webDir);

const { build } = await import('vite');

await build({ mode: 'production' });
