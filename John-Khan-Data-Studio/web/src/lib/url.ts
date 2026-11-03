export type ParamPatch = Record<string, string | number | boolean | undefined | null>;

/** 合并并规范化 URL 查询参数：空值删除，翻页参数在筛选变化时重置。 */
export function patchSearchParams(
  current: URLSearchParams,
  patch: ParamPatch,
  options: { resetPage?: boolean } = {},
): URLSearchParams {
  const next = new URLSearchParams(current);

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === '' || value === false) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }

  if (options.resetPage !== false && !('page' in patch)) {
    next.delete('page');
  }

  return next;
}

export function readString(params: URLSearchParams, key: string, fallback = ''): string {
  return params.get(key) ?? fallback;
}

export function readNumber(params: URLSearchParams, key: string, fallback: number): number {
  const value = Number(params.get(key));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function readEnum<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[], fallback: T): T {
  const value = params.get(key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
