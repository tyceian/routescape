import { Request, Response, NextFunction } from 'express';

export interface TtlOverrideRule {
  path: string | RegExp;
  methods?: string[];
  ttl: number; // seconds
  sMaxAge?: number;
}

export interface TtlOverrideOptions {
  rules: TtlOverrideRule[];
  onOverride?: (req: Request, ttl: number) => void;
}

export function matchesTtlPath(path: string | RegExp, reqPath: string): boolean {
  if (typeof path === 'string') {
    return reqPath === path || reqPath.startsWith(path.endsWith('/') ? path : path + '/');
  }
  return path.test(reqPath);
}

export function findTtlRule(
  req: Request,
  rules: TtlOverrideRule[]
): TtlOverrideRule | undefined {
  return rules.find((rule) => {
    const pathMatch = matchesTtlPath(rule.path, req.path);
    if (!pathMatch) return false;
    if (rule.methods && rule.methods.length > 0) {
      return rule.methods.map((m) => m.toUpperCase()).includes(req.method.toUpperCase());
    }
    return true;
  });
}

export function buildTtlCacheControl(rule: TtlOverrideRule): string {
  const parts: string[] = [`max-age=${rule.ttl}`];
  if (rule.sMaxAge !== undefined) {
    parts.push(`s-maxage=${rule.sMaxAge}`);
  }
  return parts.join(', ');
}

export function cacheTtlOverride(options: TtlOverrideOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rule = findTtlRule(req, options.rules);
    if (!rule) {
      next();
      return;
    }

    const headerValue = buildTtlCacheControl(rule);

    res.on('finish', () => {
      if (!res.headersSent) return;
    });

    const originalSend = res.send.bind(res);
    res.send = function (body?: unknown) {
      if (!res.getHeader('Cache-Control')) {
        res.setHeader('Cache-Control', headerValue);
        res.setHeader('X-TTL-Override', String(rule.ttl));
        if (options.onOverride) {
          options.onOverride(req, rule.ttl);
        }
      }
      return originalSend(body);
    };

    next();
  };
}
