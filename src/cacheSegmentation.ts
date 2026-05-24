import { Request, Response, NextFunction } from 'express';

export interface SegmentRule {
  route: string | RegExp;
  segmentBy: Array<'cookie' | 'header' | 'query' | 'method'>;
  cookieKeys?: string[];
  headerKeys?: string[];
  queryKeys?: string[];
}

export interface CacheSegmentationOptions {
  rules: SegmentRule[];
  headerName?: string;
}

export function matchesSegmentRoute(path: string, route: string | RegExp): boolean {
  if (route instanceof RegExp) return route.test(path);
  if (route.endsWith('*')) return path.startsWith(route.slice(0, -1));
  return path === route;
}

export function buildSegmentKey(req: Request, rule: SegmentRule): string {
  const parts: string[] = [];

  if (rule.segmentBy.includes('method')) {
    parts.push(`method=${req.method}`);
  }

  if (rule.segmentBy.includes('cookie') && rule.cookieKeys?.length) {
    const cookies = req.cookies ?? {};
    for (const key of rule.cookieKeys) {
      const val = cookies[key] ?? '';
      parts.push(`cookie:${key}=${val}`);
    }
  }

  if (rule.segmentBy.includes('header') && rule.headerKeys?.length) {
    for (const key of rule.headerKeys) {
      const val = req.headers[key.toLowerCase()] ?? '';
      parts.push(`header:${key}=${val}`);
    }
  }

  if (rule.segmentBy.includes('query') && rule.queryKeys?.length) {
    for (const key of rule.queryKeys) {
      const val = (req.query[key] as string) ?? '';
      parts.push(`query:${key}=${val}`);
    }
  }

  return parts.join(';');
}

export function findSegmentRule(path: string, rules: SegmentRule[]): SegmentRule | undefined {
  return rules.find(r => matchesSegmentRoute(path, r.route));
}

export function cacheSegmentation(options: CacheSegmentationOptions) {
  const { rules, headerName = 'X-Cache-Segment' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const rule = findSegmentRule(req.path, rules);
    if (rule) {
      const key = buildSegmentKey(req, rule);
      if (key) {
        res.setHeader(headerName, key);
      }
    }
    next();
  };
}
