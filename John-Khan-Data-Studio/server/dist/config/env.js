import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { defaultPaths, repoRoot, serverRoot } from './paths.js';
for (const file of [path.join(repoRoot, '.env'), path.join(serverRoot, '.env')]) {
    if (fs.existsSync(file))
        dotenv.config({ path: file });
}
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().default('0.0.0.0'),
    DATABASE_FILE: z.string().default(defaultPaths.databaseFile),
    SEED_DIR: z.string().default(defaultPaths.seedDir),
    WEB_DIST: z.string().default(defaultPaths.webDist),
    AVATAR_DIR: z.string().default(defaultPaths.avatarDir),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
    // 注意：不要用 z.coerce.boolean()，"false" 字符串会被转成 true。
    TRUST_PROXY: z
        .string()
        .default('false')
        .transform((value) => value === 'true' || value === '1'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`环境变量校验失败：\n${issues}`);
}
export const env = {
    ...parsed.data,
    databaseFile: path.resolve(parsed.data.DATABASE_FILE),
    seedDir: path.resolve(parsed.data.SEED_DIR),
    webDist: path.resolve(parsed.data.WEB_DIST),
    avatarDir: path.resolve(parsed.data.AVATAR_DIR),
    corsOrigins: parsed.data.CORS_ORIGIN.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    isProduction: parsed.data.NODE_ENV === 'production',
};
//# sourceMappingURL=env.js.map