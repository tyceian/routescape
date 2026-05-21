import { Request, Response, NextFunction } from 'express';

export interface ConditionalGetOptions {
  respectIfModifiedSince?: boolean;
  respectIfNoneMatch?: boolean;
}

/**
 * Parses the If-Modified-Since header and returns the date or null.
 */
export function parseIfModifiedSince(req: Request): Date | null {
  const header = req.headers['if-modified-since'];
  if (!header) return null;
  const date = new Date(header);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Checks whether the response should be considered not modified
 * based on If-Modified-Since and/or If-None-Match headers.
 */
export function isNotModified(
  req: Request,
  lastModified: Date | null,
  etag: string | null,
  options: ConditionalGetOptions = {}
): boolean {
  const { respectIfModifiedSince = true, respectIfNoneMatch = true } = options;

  const ifNoneMatch = req.headers['if-none-match'];
  if (respectIfNoneMatch && ifNoneMatch && etag) {
    const tags = ifNoneMatch.split(',').map((t) => t.trim());
    if (tags.includes(etag) || tags.includes('*')) {
      return true;
    }
  }

  if (respectIfModifiedSince && lastModified) {
    const ifModifiedSince = parseIfModifiedSince(req);
    if (ifModifiedSince && lastModified <= ifModifiedSince) {
      return true;
    }
  }

  return false;
}

/**
 * Express middleware that sends 304 Not Modified when appropriate.
 * Expects res.locals.lastModified (Date) and/or res.locals.etag (string)
 * to be set by upstream middleware or route handlers.
 */
export function conditionalGet(options: ConditionalGetOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      return next();
    }

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const checkAndRespond = (body?: unknown) => {
      const lastModified: Date | null = res.locals.lastModified ?? null;
      const etag: string | null = res.locals.etag ?? null;

      if (isNotModified(req, lastModified, etag, options)) {
        res.status(304).end();
        return true;
      }
      return false;
    };

    res.json = function (body: unknown) {
      if (checkAndRespond()) return res;
      return originalJson(body);
    };

    res.send = function (body?: unknown) {
      if (checkAndRespond()) return res;
      return originalSend(body);
    };

    next();
  };
}
