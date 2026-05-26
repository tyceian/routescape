import { Request, Response, NextFunction } from 'express';

export interface GracePeriodRule {
  path: string | RegExp;
  staleIfError?: number;  // seconds
  graceWindow?: number;  // seconds to serve stale while revalidating
}

export interface GracePeriodOptions {
  rules: GracePeriodRule[];
  defaultStaleIfError?: number;
}

export function matchesGracePath(path: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) return pattern.test(path);
  if (pattern.endsWith('*')) return path.startsWith(pattern.slice(0, -1));
  return path === pattern;
}

export function findGraceRule(
  path: string,
  rules: GracePeriodRule[]
): GracePeriodRule | undefined {
  return rules.find((rule) => matchesGracePath(path, rule.path));
}

export function buildGraceHeaders(
  rule: GracePeriodRule,
  defaultStaleIfError?: number
): Record<string, string> {
  const headers: Record<string, string> = {};
  const directives: string[] = [];

  const staleIfError = rule.staleIfError ?? defaultStaleIfError;
  if (staleIfError !== undefined) {
    directives.push(`stale-if-error=${staleIfError}`);
  }

  if (rule.graceWindow !== undefined) {
    directives.push(`stale-while-revalidate=${rule.graceWindow}`);
  }

  if (directives.length > 0) {
    headers['X-Cache-Grace'] = directives.join(', ');
    headers['Cache-Control'] = directives.join(', ');
  }

  return headers;
}

export function cacheGracePeriod(options: GracePeriodOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rule = findGraceRule(req.path, options.rules);

    if (!rule) {
      next();
      return;
    }

    const headers = buildGraceHeaders(rule, options.defaultStaleIfError);

    res.on('finish', () => {
      Object.entries(headers).forEach(([key, value]) => {
        if (!res.headersSent) return;
        res.setHeader(key, value);
      });
    });

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    next();
  };
}
