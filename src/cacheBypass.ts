import { Request, Response, NextFunction } from 'express';

export interface CacheBypassOptions {
  headers?: string[];
  queryParams?: string[];
  cookieNames?: string[];
  bypassResponseHeader?: string;
}

const DEFAULT_BYPASS_HEADERS = ['x-cache-bypass', 'x-no-cache'];
const DEFAULT_BYPASS_PARAMS = ['nocache', 'bypass_cache'];

export function hasBypassHeader(req: Request, headers: string[]): boolean {
  return headers.some((h) => {
    const val = req.headers[h.toLowerCase()];
    return val === '1' || val === 'true';
  });
}

export function hasBypassQueryParam(req: Request, params: string[]): boolean {
  return params.some((p) => p in req.query);
}

export function hasBypassCookie(req: Request, cookieNames: string[]): boolean {
  const cookieHeader = req.headers['cookie'] || '';
  return cookieNames.some((name) => {
    const pattern = new RegExp(`(?:^|;\\s*)${name}\\s*=`);
    return pattern.test(cookieHeader);
  });
}

export function shouldBypass(
  req: Request,
  options: Required<CacheBypassOptions>
): boolean {
  return (
    hasBypassHeader(req, options.headers) ||
    hasBypassQueryParam(req, options.queryParams) ||
    hasBypassCookie(req, options.cookieNames)
  );
}

export function cacheBypass(options: CacheBypassOptions = {}) {
  const resolved: Required<CacheBypassOptions> = {
    headers: options.headers ?? DEFAULT_BYPASS_HEADERS,
    queryParams: options.queryParams ?? DEFAULT_BYPASS_PARAMS,
    cookieNames: options.cookieNames ?? [],
    bypassResponseHeader: options.bypassResponseHeader ?? 'x-cache-bypassed',
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    if (shouldBypass(req, resolved)) {
      res.setHeader('Cache-Control', 'no-store, no-cache');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader(resolved.bypassResponseHeader, '1');
    }
    next();
  };
}
