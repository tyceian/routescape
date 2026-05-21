import { Request, Response, NextFunction } from 'express';
import { StaleWhileRevalidateOptions } from './types';

/**
 * Builds the stale-while-revalidate and stale-if-error directives string.
 */
export function buildStaleDirectives(options: StaleWhileRevalidateOptions): string {
  const parts: string[] = [];

  if (options.staleWhileRevalidate !== undefined) {
    parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  if (options.staleIfError !== undefined) {
    parts.push(`stale-if-error=${options.staleIfError}`);
  }

  return parts.join(', ');
}

/**
 * Merges stale directives into an existing Cache-Control header value.
 */
export function mergeStaleDirectives(existing: string, staleDirectives: string): string {
  if (!staleDirectives) return existing;
  if (!existing) return staleDirectives;
  return `${existing}, ${staleDirectives}`;
}

/**
 * Express middleware that appends stale-while-revalidate and/or stale-if-error
 * directives to the Cache-Control response header.
 */
export function staleWhileRevalidate(options: StaleWhileRevalidateOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const staleDirectives = buildStaleDirectives(options);

    if (!staleDirectives) {
      next();
      return;
    }

    const originalSetHeader = res.setHeader.bind(res);

    res.setHeader = (name: string, value: string | number | readonly string[]): Response => {
      if (name.toLowerCase() === 'cache-control') {
        const merged = mergeStaleDirectives(String(value), staleDirectives);
        return originalSetHeader(name, merged);
      }
      return originalSetHeader(name, value);
    };

    res.on('finish', () => {
      const current = res.getHeader('cache-control');
      if (current && !String(current).includes('stale-')) {
        const merged = mergeStaleDirectives(String(current), staleDirectives);
        originalSetHeader('cache-control', merged);
      }
    });

    next();
  };
}
