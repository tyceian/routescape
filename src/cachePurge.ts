import { Request, Response, NextFunction } from 'express';
import { CachePurgeOptions, CachePurgeRule } from './types';

/**
 * Checks if the incoming request is a purge request.
 * Supports X-Purge-Token header or a dedicated HTTP method.
 */
export function isPurgeRequest(req: Request, method: string = 'PURGE'): boolean {
  return req.method.toUpperCase() === method.toUpperCase();
}

/**
 * Matches a purge path pattern against the request URL.
 * Supports wildcard (*) at the end of patterns.
 */
export function matchesPurgePath(pattern: string, url: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return url.startsWith(prefix);
  }
  return pattern === url;
}

/**
 * Validates the purge token from the request headers.
 */
export function isValidPurgeToken(req: Request, secret: string): boolean {
  const token = req.headers['x-purge-token'];
  return typeof token === 'string' && token === secret;
}

/**
 * Builds the response headers for a successful purge.
 */
export function buildPurgeResponseHeaders(purgedPaths: string[]): Record<string, string> {
  return {
    'X-Purged-Paths': purgedPaths.join(', '),
    'X-Purge-Status': 'ok',
  };
}

/**
 * Express middleware that handles cache purge requests.
 * Validates token, matches rules, and responds with purge metadata.
 */
export function cachePurge(options: CachePurgeOptions) {
  const { secret, rules = [], purgeMethod = 'PURGE', onPurge } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isPurgeRequest(req, purgeMethod)) {
      return next();
    }

    if (secret && !isValidPurgeToken(req, secret)) {
      res.status(403).json({ error: 'Invalid or missing purge token' });
      return;
    }

    const url = req.path || req.url;
    const matchedRules: CachePurgeRule[] = rules.filter((rule) =>
      matchesPurgePath(rule.path, url)
    );

    const purgedPaths = matchedRules.map((r) => r.path);

    if (onPurge && matchedRules.length > 0) {
      onPurge(matchedRules, req);
    }

    const headers = buildPurgeResponseHeaders(purgedPaths);
    Object.entries(headers).forEach(([key, val]) => res.setHeader(key, val));

    res.status(200).json({
      purged: purgedPaths,
      count: purgedPaths.length,
    });
  };
}
