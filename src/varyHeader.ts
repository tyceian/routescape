import { Request, Response, NextFunction } from 'express';
import { VaryOptions } from './types';

/**
 * Builds a Vary header value from an array of header names.
 */
export function buildVaryHeader(headers: string[]): string {
  if (!headers || headers.length === 0) return '';
  return headers.map(h => h.trim()).join(', ');
}

/**
 * Appends values to an existing Vary header without duplicating entries.
 */
export function mergeVaryHeaders(existing: string, incoming: string[]): string {
  const existingParts = existing
    ? existing.split(',').map(h => h.trim().toLowerCase())
    : [];

  const toAdd = incoming.filter(
    h => !existingParts.includes(h.trim().toLowerCase())
  );

  const combined = [
    ...(existing ? [existing] : []),
    ...toAdd,
  ];

  return combined.join(', ');
}

/**
 * Express middleware that sets the Vary header based on provided options.
 */
export function varyHeader(options: VaryOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!options.headers || options.headers.length === 0) {
      return next();
    }

    const existing = res.getHeader('Vary') as string | undefined;
    const newValue = existing
      ? mergeVaryHeaders(existing, options.headers)
      : buildVaryHeader(options.headers);

    res.setHeader('Vary', newValue);
    next();
  };
}
