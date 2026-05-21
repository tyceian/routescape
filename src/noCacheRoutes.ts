import { Request, Response, NextFunction } from 'express';
import { RoutePattern } from './types';

/**
 * Checks if a given path matches a no-cache pattern.
 * Supports exact strings and RegExp patterns.
 */
export function matchesNoCachePattern(
  path: string,
  pattern: RoutePattern
): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(path);
  }
  // Support wildcard suffix like '/api/private/*'
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return path === prefix || path.startsWith(prefix + '/');
  }
  return path === pattern;
}

/**
 * Builds a no-store / no-cache Cache-Control header value.
 */
export function buildNoCacheHeader(noStore = false): string {
  if (noStore) {
    return 'no-store';
  }
  return 'no-cache, no-store, must-revalidate';
}

/**
 * Express middleware that applies aggressive no-cache headers
 * to any route matching the provided patterns.
 *
 * @param patterns - Array of route patterns (string or RegExp) to block from caching
 * @param noStore  - If true, uses `no-store` only; otherwise full no-cache directive set
 *
 * @example
 * app.use(noCacheRoutes(['/admin/*', /^\/api\/private/]))
 */
export function noCacheRoutes(
  patterns: RoutePattern[],
  noStore = false
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const path = req.path;
    const matches = patterns.some((pattern) =>
      matchesNoCachePattern(path, pattern)
    );

    if (matches) {
      const headerValue = buildNoCacheHeader(noStore);
      res.setHeader('Cache-Control', headerValue);
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  };
}
