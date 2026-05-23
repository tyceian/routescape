import { Request, Response, NextFunction } from 'express';

export interface InvalidationRule {
  methods: string[];
  path: string | RegExp;
  invalidates: (string | RegExp)[];
}

export interface CacheInvalidationOptions {
  rules: InvalidationRule[];
  onInvalidate?: (paths: string[], req: Request) => void;
}

export function matchesInvalidationPath(
  reqPath: string,
  pattern: string | RegExp
): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(reqPath);
  }
  return reqPath === pattern;
}

export function resolveInvalidationTargets(
  req: Request,
  rules: InvalidationRule[]
): string[] {
  const targets: string[] = [];

  for (const rule of rules) {
    const methodMatch = rule.methods
      .map((m) => m.toUpperCase())
      .includes(req.method.toUpperCase());

    if (!methodMatch) continue;

    if (!matchesInvalidationPath(req.path, rule.path)) continue;

    for (const target of rule.invalidates) {
      const resolved =
        target instanceof RegExp ? target.source : target;
      if (!targets.includes(resolved)) {
        targets.push(resolved);
      }
    }
  }

  return targets;
}

export function buildInvalidationHeaders(targets: string[]): string {
  return targets.join(', ');
}

export function cacheInvalidation(options: CacheInvalidationOptions) {
  const { rules, onInvalidate } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    const targets = resolveInvalidationTargets(req, rules);

    if (targets.length === 0) {
      return next();
    }

    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        res.setHeader('X-Cache-Invalidate', buildInvalidationHeaders(targets));
        if (onInvalidate) {
          onInvalidate(targets, req);
        }
      }
    });

    next();
  };
}
