import { Request, Response, NextFunction } from 'express';
import { CacheRevalidationOptions, RevalidationRule } from './types';

export function matchesRevalidationPath(path: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) return pattern.test(path);
  if (pattern.endsWith('*')) return path.startsWith(pattern.slice(0, -1));
  return path === pattern;
}

export function findRevalidationRule(
  path: string,
  rules: RevalidationRule[]
): RevalidationRule | undefined {
  return rules.find((rule) => matchesRevalidationPath(path, rule.path));
}

export function buildRevalidationHeaders(
  rule: RevalidationRule
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (rule.staleWhileRevalidate !== undefined) {
    headers['Cache-Control'] =
      `max-age=${rule.maxAge ?? 0}, stale-while-revalidate=${rule.staleWhileRevalidate}`;
  }

  if (rule.staleIfError !== undefined) {
    const existing = headers['Cache-Control'] ?? `max-age=${rule.maxAge ?? 0}`;
    headers['Cache-Control'] = `${existing}, stale-if-error=${rule.staleIfError}`;
  }

  if (rule.mustRevalidate) {
    const existing = headers['Cache-Control'] ?? `max-age=${rule.maxAge ?? 0}`;
    headers['Cache-Control'] = `${existing}, must-revalidate`;
  }

  if (!headers['Cache-Control'] && rule.maxAge !== undefined) {
    headers['Cache-Control'] = `max-age=${rule.maxAge}`;
  }

  if (rule.proxyRevalidate) {
    headers['Cache-Control'] = `${headers['Cache-Control'] ?? ''}, proxy-revalidate`.trim();
  }

  return headers;
}

export function cacheRevalidation(options: CacheRevalidationOptions) {
  const { rules = [] } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const rule = findRevalidationRule(req.path, rules);

    if (!rule) {
      return next();
    }

    const headers = buildRevalidationHeaders(rule);

    res.on('finish', () => {
      // headers already sent, nothing to do
    });

    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }

    next();
  };
}
