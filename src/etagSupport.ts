import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { ETagOptions } from './types';

/**
 * Generates a weak ETag from a response body string.
 */
export function generateETag(body: string, weak = true): string {
  const hash = createHash('md5').update(body).digest('hex').slice(0, 16);
  return weak ? `W/"${hash}"` : `"${hash}"`;
}

/**
 * Checks if the request has a matching ETag via If-None-Match.
 */
export function isETagMatch(req: Request, etag: string): boolean {
  const ifNoneMatch = req.headers['if-none-match'];
  if (!ifNoneMatch) return false;
  const candidates = ifNoneMatch.split(',').map((t) => t.trim());
  return candidates.includes(etag) || candidates.includes('*');
}

/**
 * Express middleware that adds ETag support to JSON/text responses.
 * Intercepts res.json and res.send to compute and attach ETags.
 */
export function etagSupport(options: ETagOptions = {}) {
  const { weak = true, respectClientETag = true } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const attachETag = (body: unknown): string => {
      const serialized =
        typeof body === 'string' ? body : JSON.stringify(body);
      const etag = generateETag(serialized, weak);
      res.setHeader('ETag', etag);

      if (respectClientETag && isETagMatch(req, etag)) {
        res.removeHeader('Content-Type');
        res.removeHeader('Content-Length');
        res.status(304).end();
        return '';
      }

      return serialized;
    };

    res.json = (body: unknown) => {
      const serialized = attachETag(body);
      if (res.headersSent) return res;
      res.setHeader('Content-Type', 'application/json');
      return originalSend(serialized);
    };

    res.send = (body: unknown) => {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        const serialized = attachETag(body);
        if (res.headersSent) return res;
        return originalSend(serialized);
      }
      return originalSend(body);
    };

    next();
  };
}
