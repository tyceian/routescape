import { Request, Response, NextFunction, RequestHandler } from 'express';
import { CacheWarmingOptions, WarmingEntry } from './types';

const warmingRegistry = new Map<string, WarmingEntry>();

export function registerWarmRoute(path: string, entry: WarmingEntry): void {
  warmingRegistry.set(path, entry);
}

export function getWarmingRegistry(): Map<string, WarmingEntry> {
  return warmingRegistry;
}

export function isWarmingRequest(req: Request): boolean {
  return req.headers['x-cache-warm'] === '1';
}

export function buildWarmingHeaders(
  entry: WarmingEntry
): Record<string, string> {
  const headers: Record<string, string> = {
    'x-cache-warm': '1',
  };
  if (entry.priority) {
    headers['x-warm-priority'] = String(entry.priority);
  }
  return headers;
}

export function cacheWarming(options: CacheWarmingOptions = {}): RequestHandler {
  const { onWarm, onError, markHeader = 'x-cache-warmed' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isWarmingRequest(req)) {
      return next();
    }

    const originalEnd = res.end.bind(res);

    (res as any).end = function (
      chunk?: any,
      encoding?: any,
      cb?: any
    ): Response {
      res.setHeader(markHeader, 'true');
      res.setHeader('x-warm-timestamp', new Date().toISOString());

      const path = req.path;
      const entry = warmingRegistry.get(path);

      if (entry && onWarm) {
        try {
          onWarm(path, res.statusCode);
        } catch (err) {
          if (onError) onError(path, err as Error);
        }
      }

      return originalEnd(chunk, encoding, cb);
    };

    next();
  };
}
