import { Request, Response, NextFunction } from 'express';

export interface CacheRule {
  maxAge?: number;
  sMaxAge?: number;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  public?: boolean;
  private?: boolean;
  immutable?: boolean;
}

export function buildCacheControlHeader(rule: CacheRule): string {
  const directives: string[] = [];

  if (rule.noStore) return 'no-store';
  if (rule.noCache) directives.push('no-cache');

  if (rule.public) directives.push('public');
  else if (rule.private) directives.push('private');

  if (rule.maxAge !== undefined) directives.push(`max-age=${rule.maxAge}`);
  if (rule.sMaxAge !== undefined) directives.push(`s-maxage=${rule.sMaxAge}`);
  if (rule.mustRevalidate) directives.push('must-revalidate');
  if (rule.immutable) directives.push('immutable');

  return directives.join(', ');
}

export function cacheControl(rule: CacheRule) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const header = buildCacheControlHeader(rule);
    if (header) {
      res.setHeader('Cache-Control', header);
    }
    next();
  };
}
