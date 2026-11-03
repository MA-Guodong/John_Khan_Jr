import path from 'node:path';
import { fileURLToPath } from 'node:url';
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
/** `server/` 目录（src 与 dist 都位于其下两级）。 */
export const serverRoot = path.resolve(moduleDir, '..', '..');
/** 仓库根目录。 */
export const repoRoot = path.resolve(serverRoot, '..');
export const defaultPaths = {
    databaseFile: path.join(serverRoot, 'data', 'khan.db'),
    seedDir: path.join(repoRoot, 'data', 'seed'),
    webDist: path.join(repoRoot, 'web', 'dist'),
    /** 头像原图目录，Python 爬虫与 Node 共用；独立于构建产物，新增头像无需重新 build。 */
    avatarDir: path.join(repoRoot, 'web', 'public', 'images'),
};
//# sourceMappingURL=paths.js.map