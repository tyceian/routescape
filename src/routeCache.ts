import { Request, Response, NextFunction, RequestHandler } from 'express';
import { buildCacheControlHeader } from './cacheControl';
import { CacheRule, RouteCacheOptions } from './types';

/**
 * Matches a route pattern against a request path.
 * Supports exact matches and simple wildcard (*) at the end.
 */
export function matchRoute(pattern: string, path: string): boolean {
  if (pattern === path) return true;
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return path.startsWith(prefix);
  }
  return false;
}

/**
 * Finds the first matching cache rule for a given request path and method.
 */
export function findMatchingRule(
  rules: CacheRule[],
  path: string,
  method: string
): CacheRule | undefined {
  return rules.find((rule) => {
    const methodMatch =
      !rule.methods ||
      rule.methods.map((m) => m.toUpperCase()).includes(method.toUpperCase());
    return methodMatch && matchRoute(rule.path, path);
  });
}

/**
 * Express middleware factory that applies declarative cache rules
 * to matched routes by setting the Cache-Control header.
 */
export function routeCache(options: RouteCacheOptions): RequestHandler {
  const { rules, defaultDirectives } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const rule = findMatchingRule(rules, req.path, req.method);

    if (rule) {
      const header = buildCacheControlHeader(rule.directives);
      res.setHeader('Cache-Control', header);
    } else if (defaultDirectives) {
      const header = buildCacheControlHeader(defaultDirectives);
      res.setHeader('Cache-Control', header);
    }

    next();
  };
}
