import { Request, Response, NextFunction } from 'express';

export type CacheTagRule = {
  match: string | RegExp;
  tags: string[] | ((req: Request) => string[]);
};

export type CacheTaggingOptions = {
  rules: CacheTagRule[];
  headerName?: string;
};

export function matchesRoute(path: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(path);
  }
  if (pattern.endsWith('*')) {
    return path.startsWith(pattern.slice(0, -1));
  }
  return path === pattern;
}

export function resolveTags(
  req: Request,
  tags: string[] | ((req: Request) => string[])
): string[] {
  return typeof tags === 'function' ? tags(req) : tags;
}

export function buildCacheTagHeader(tags: string[]): string {
  return [...new Set(tags)].join(' ');
}

export function findMatchingTagRules(
  req: Request,
  rules: CacheTagRule[]
): CacheTagRule[] {
  return rules.filter((rule) => matchesRoute(req.path, rule.match));
}

export function cacheTagging(options: CacheTaggingOptions) {
  const { rules, headerName = 'Cache-Tag' } = options;

  return function cacheTaggingMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const matchingRules = findMatchingTagRules(req, rules);

    if (matchingRules.length === 0) {
      return next();
    }

    const allTags = matchingRules.flatMap((rule) => resolveTags(req, rule.tags));
    const headerValue = buildCacheTagHeader(allTags);

    if (headerValue) {
      res.setHeader(headerName, headerValue);
    }

    next();
  };
}
