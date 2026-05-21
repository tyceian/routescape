import { Request, Response, NextFunction } from 'express';
import { SurrogateCacheOptions, SurrogateRule } from './types';

/**
 * Builds a Surrogate-Control header value (used by CDNs like Fastly, Varnish).
 */
export function buildSurrogateHeader(options: SurrogateRule): string {
  const directives: string[] = [];

  if (options.maxAge !== undefined) {
    directives.push(`max-age=${options.maxAge}`);
  }

  if (options.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  if (options.staleIfError !== undefined) {
    directives.push(`stale-if-error=${options.staleIfError}`);
  }

  if (options.noStore) {
    return 'no-store';
  }

  return directives.join(', ');
}

/**
 * Merges a Surrogate-Control header with an existing one, taking the minimum max-age.
 */
export function mergeSurrogateHeaders(existing: string, incoming: string): string {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const parseMaxAge = (val: string): number | null => {
    const match = val.match(/max-age=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const existingAge = parseMaxAge(existing);
  const incomingAge = parseMaxAge(incoming);

  if (existingAge !== null && incomingAge !== null) {
    return incoming.replace(/max-age=\d+/, `max-age=${Math.min(existingAge, incomingAge)}`);
  }

  return incoming;
}

/**
 * Express middleware that sets Surrogate-Control headers based on route rules.
 */
export function surrogateCacheControl(options: SurrogateCacheOptions) {
  const { rules = [], stripOnResponse = false } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const matchedRule = rules.find(rule => {
      const methods = rule.methods ?? ['GET', 'HEAD'];
      if (!methods.includes(req.method)) return false;
      if (typeof rule.path === 'string') return req.path === rule.path;
      return rule.path.test(req.path);
    });

    if (matchedRule) {
      const header = buildSurrogateHeader(matchedRule);
      if (header) {
        const existing = res.getHeader('Surrogate-Control') as string | undefined;
        const merged = existing ? mergeSurrogateHeaders(existing, header) : header;
        res.setHeader('Surrogate-Control', merged);
      }

      if (stripOnResponse) {
        res.on('finish', () => {
          res.removeHeader('Surrogate-Control');
        });
      }
    }

    next();
  };
}
