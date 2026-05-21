import { Request, Response, NextFunction } from 'express';
import { CacheByStatusOptions, StatusCacheRule } from './types';

/**
 * Finds the matching status rule for a given HTTP status code.
 */
export function findStatusRule(
  statusCode: number,
  rules: StatusCacheRule[]
): StatusCacheRule | undefined {
  return rules.find((rule) => {
    if (typeof rule.status === 'number') {
      return rule.status === statusCode;
    }
    if (Array.isArray(rule.status)) {
      return rule.status.includes(statusCode);
    }
    if (typeof rule.status === 'string' && rule.status.endsWith('xx')) {
      const prefix = rule.status[0];
      return String(statusCode).startsWith(prefix);
    }
    return false;
  });
}

/**
 * Builds a Cache-Control header value from a StatusCacheRule.
 */
export function buildStatusCacheHeader(rule: StatusCacheRule): string {
  if (rule.noCache) {
    return 'no-store, no-cache, must-revalidate';
  }
  const directives: string[] = [];
  if (rule.private) {
    directives.push('private');
  } else {
    directives.push('public');
  }
  if (typeof rule.maxAge === 'number') {
    directives.push(`max-age=${rule.maxAge}`);
  }
  if (typeof rule.sMaxAge === 'number') {
    directives.push(`s-maxage=${rule.sMaxAge}`);
  }
  return directives.join(', ');
}

/**
 * Middleware that applies Cache-Control headers based on the response status code.
 * Rules are evaluated after the response status is set, using res.on('finish').
 */
export function cacheByStatus(options: CacheByStatusOptions) {
  const { rules, overrideExisting = false } = options;

  return (_req: Request, res: Response, next: NextFunction): void => {
    const originalWriteHead = res.writeHead.bind(res);

    // @ts-ignore — override writeHead to intercept status before send
    res.writeHead = function (statusCode: number, ...args: any[]) {
      const rule = findStatusRule(statusCode, rules);
      if (rule) {
        const existing = res.getHeader('Cache-Control');
        if (!existing || overrideExisting) {
          res.setHeader('Cache-Control', buildStatusCacheHeader(rule));
        }
      }
      return originalWriteHead(statusCode, ...args);
    };

    next();
  };
}
