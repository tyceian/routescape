import { Request, Response, NextFunction } from 'express';
import { RouteCacheOptions, RouteRule } from './types';
import { buildCacheControlHeader } from './cacheControl';
import { buildVaryHeader, mergeVaryHeaders } from './varyHeader';

/**
 * Checks whether a request path matches a given route pattern.
 * Supports exact string matches, wildcard suffix patterns (e.g. "/api/*"),
 * and regular expressions.
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
 * Rules are evaluated in order; the first match wins.
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
 * Applies the Cache-Control header to the response based on the resolved options.
 * Does nothing if no options are provided or the resulting header is empty.
 */
function applyCacheControl(res: Response, opts: RouteCacheOptions['defaultCacheControl']): void {
  if (!opts) return;
  const header = buildCacheControlHeader(opts);
  if (header) res.setHeader('Cache-Control', header);
}

/**
 * Applies the Vary header to the response, merging with any existing value.
 * Does nothing if no options are provided or the headers list is empty.
 */
function applyVary(res: Response, opts: RouteCacheOptions['defaultVary']): void {
  if (!opts || opts.headers.length === 0) return;
  const existing = res.getHeader('Vary') as string | undefined;
  const newVary = existing
    ? mergeVaryHeaders(existing, opts.headers)
    : buildVaryHeader(opts.headers);
  res.setHeader('Vary', newVary);
}

/**
 * Express middleware factory that applies cache-control and vary headers
 * based on declarative route rules.
 */
export function routeCache(options: RouteCacheOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rule = findMatchingRule(req, options.rules);

    applyCacheControl(res, rule?.cacheControl ?? options.defaultCacheControl);
    applyVary(res, rule?.vary ?? options.defaultVary);

    next();
  };
}
