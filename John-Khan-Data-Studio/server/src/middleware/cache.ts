import type { RequestHandler } from 'express';

/** 给只读接口加缓存头，减少重复查询。 */
export function cacheControl(maxAgeSeconds: number): RequestHandler {
  return (_req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 5}`);
    next();
  };
}
