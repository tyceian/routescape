import { Request, Response, NextFunction } from 'express';

export interface CacheDebugOptions {
  enabled?: boolean;
  headerPrefix?: string;
  includeTimestamp?: boolean;
  includeRoute?: boolean;
}

export interface CacheDebugInfo {
  hit: boolean;
  key?: string;
  age?: number;
  rule?: string;
  timestamp?: string;
  route?: string;
}

export function buildDebugHeaders(
  info: CacheDebugInfo,
  prefix: string
): Record<string, string> {
  const headers: Record<string, string> = {};

  headers[`${prefix}-Status`] = info.hit ? 'HIT' : 'MISS';

  if (info.key !== undefined) {
    headers[`${prefix}-Key`] = info.key;
  }

  if (info.age !== undefined) {
    headers[`${prefix}-Age`] = String(info.age);
  }

  if (info.rule !== undefined) {
    headers[`${prefix}-Rule`] = info.rule;
  }

  if (info.timestamp !== undefined) {
    headers[`${prefix}-Timestamp`] = info.timestamp;
  }

  if (info.route !== undefined) {
    headers[`${prefix}-Route`] = info.route;
  }

  return headers;
}

export function attachDebugInfo(res: Response, info: CacheDebugInfo): void {
  (res as any).__cacheDebug = info;
}

export function getDebugInfo(res: Response): CacheDebugInfo | undefined {
  return (res as any).__cacheDebug;
}

export function cacheDebug(options: CacheDebugOptions = {}) {
  const {
    enabled = true,
    headerPrefix = 'X-Cache-Debug',
    includeTimestamp = true,
    includeRoute = true,
  } = options;

  return function cacheDebugMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    if (!enabled) {
      return next();
    }

    const originalEnd = res.end.bind(res);

    (res as any).end = function (...args: any[]) {
      const info = getDebugInfo(res);

      if (info) {
        const enriched: CacheDebugInfo = {
          ...info,
          ...(includeTimestamp ? { timestamp: new Date().toISOString() } : {}),
          ...(includeRoute ? { route: req.path } : {}),
        };

        const headers = buildDebugHeaders(enriched, headerPrefix);

        for (const [key, value] of Object.entries(headers)) {
          if (!res.headersSent) {
            res.setHeader(key, value);
          }
        }
      }

      return originalEnd(...args);
    };

    next();
  };
}
