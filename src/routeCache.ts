import { Request, Response, NextFunction } from 'express';
import { RouteCacheOptions, RouteRule } from './types';
import { buildCacheControlHeader } from './cacheControl';
import { buildVaryHeader, mergeVaryHeaders } from './varyHeader';

/**
 * Checks whether a request path matches a given route pattern.
 */
export function matchRoute(reqPath: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(reqPath);
  }
  if (pattern.endsWith('*')) {
    return reqPath.startsWith(pattern.slice(0, -1));
  }
  return reqPath === pattern;
}

/**
 * Finds the first matching rule for the incoming request.
 */
export function findMatchingRule(
  req: Request,
  rules: RouteRule[]
): RouteRule | undefined {
  return rules.find(rule => {
    const pathMatches = matchRoute(req.path, rule.path);
    if (!pathMatches) return false;

    if (rule.methods && rule.methods.length > 0) {
      return rule.methods
        .map(m => m.toUpperCase())
        .includes(req.method.toUpperCase());
    }

    return true;
  });
}

/**
 * Express middleware factory that applies cache-control and vary headers
 * based on declarative route rules.
 */
export function routeCache(options: RouteCacheOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rule = findMatchingRule(req, options.rules);

    const cacheOpts = rule?.cacheControl ?? options.defaultCacheControl;
    if (cacheOpts) {
      const header = buildCacheControlHeader(cacheOpts);
      if (header) res.setHeader('Cache-Control', header);
    }

    const varyOpts = rule?.vary ?? options.defaultVary;
    if (varyOpts && varyOpts.headers.length > 0) {
      const existing = res.getHeader('Vary') as string | undefined;
      const newVary = existing
        ? mergeVaryHeaders(existing, varyOpts.headers)
        : buildVaryHeader(varyOpts.headers);
      res.setHeader('Vary', newVary);
    }

    next();
  };
}
