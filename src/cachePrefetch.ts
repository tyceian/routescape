import { Request, Response, NextFunction } from 'express';

export interface PrefetchRule {
  route: string | RegExp;
  resources: string[];
  as?: 'fetch' | 'document' | 'script' | 'style' | 'image';
  crossorigin?: boolean;
}

export interface PrefetchOptions {
  rules: PrefetchRule[];
  headerName?: string;
}

export function matchesPrefetchRoute(path: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) return pattern.test(path);
  if (pattern.endsWith('*')) return path.startsWith(pattern.slice(0, -1));
  return path === pattern;
}

export function findPrefetchRule(path: string, rules: PrefetchRule[]): PrefetchRule | undefined {
  return rules.find(rule => matchesPrefetchRoute(path, rule.route));
}

export function buildLinkHeader(rule: PrefetchRule): string {
  return rule.resources
    .map(resource => {
      let link = `<${resource}>; rel=prefetch`;
      if (rule.as) link += `; as=${rule.as}`;
      if (rule.crossorigin) link += '; crossorigin';
      return link;
    })
    .join(', ');
}

export function cachePrefetch(options: PrefetchOptions) {
  const { rules, headerName = 'Link' } = options;

  return function cachePrefetchMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const rule = findPrefetchRule(req.path, rules);

    if (rule && rule.resources.length > 0) {
      const linkHeader = buildLinkHeader(rule);
      const existing = res.getHeader(headerName) as string | undefined;
      if (existing) {
        res.setHeader(headerName, `${existing}, ${linkHeader}`);
      } else {
        res.setHeader(headerName, linkHeader);
      }
    }

    next();
  };
}
