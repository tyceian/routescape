import { Request } from 'express';

export type KeyTransformFn = (req: Request) => string;

export interface CacheKeyTransformOptions {
  includeQuery?: boolean | string[];
  includeHeaders?: string[];
  transform?: KeyTransformFn;
}

/**
 * Builds a normalized cache key from a request.
 * By default uses the pathname only; optionally includes
 * specific query params or request headers.
 */
export function buildCacheKey(
  req: Request,
  options: CacheKeyTransformOptions = {}
): string {
  const { includeQuery = false, includeHeaders = [], transform } = options;

  if (transform) {
    return transform(req);
  }

  const pathname = req.path;

  let queryPart = '';
  if (includeQuery === true) {
    const raw = req.originalUrl.split('?')[1] ?? '';
    if (raw) queryPart = `?${raw}`;
  } else if (Array.isArray(includeQuery) && includeQuery.length > 0) {
    const params = includeQuery
      .filter((k) => req.query[k] !== undefined)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(req.query[k]))}`);
    if (params.length > 0) queryPart = `?${params.join('&')}`;
  }

  let headerPart = '';
  if (includeHeaders.length > 0) {
    const parts = includeHeaders
      .map((h) => h.toLowerCase())
      .filter((h) => req.headers[h] !== undefined)
      .map((h) => `${h}:${req.headers[h]}`);
    if (parts.length > 0) headerPart = `[${parts.join(',')}]`;
  }

  return `${pathname}${queryPart}${headerPart}`;
}

/**
 * Express middleware factory that attaches a computed cache key
 * to `res.locals.cacheKey` for downstream middleware to consume.
 */
export function cacheKeyTransform(options: CacheKeyTransformOptions = {}) {
  return (req: Request, res: any, next: () => void) => {
    res.locals.cacheKey = buildCacheKey(req, options);
    next();
  };
}
