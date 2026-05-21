import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  matchesNoCachePattern,
  buildNoCacheHeader,
  noCacheRoutes,
} from './noCacheRoutes';

describe('matchesNoCachePattern', () => {
  it('matches exact string paths', () => {
    expect(matchesNoCachePattern('/admin', '/admin')).toBe(true);
    expect(matchesNoCachePattern('/admin', '/other')).toBe(false);
  });

  it('matches wildcard suffix patterns', () => {
    expect(matchesNoCachePattern('/admin/users', '/admin/*')).toBe(true);
    expect(matchesNoCachePattern('/admin', '/admin/*')).toBe(true);
    expect(matchesNoCachePattern('/adminfoo', '/admin/*')).toBe(false);
  });

  it('matches RegExp patterns', () => {
    expect(matchesNoCachePattern('/api/private/data', /^\/api\/private/)).toBe(true);
    expect(matchesNoCachePattern('/api/public/data', /^\/api\/private/)).toBe(false);
  });
});

describe('buildNoCacheHeader', () => {
  it('returns full no-cache directive by default', () => {
    expect(buildNoCacheHeader()).toBe('no-cache, no-store, must-revalidate');
  });

  it('returns no-store only when noStore is true', () => {
    expect(buildNoCacheHeader(true)).toBe('no-store');
  });
});

describe('noCacheRoutes middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { path: '/admin/settings' };
    res = { setHeader: vi.fn() };
    next = vi.fn();
  });

  it('sets no-cache headers for matching routes', () => {
    const middleware = noCacheRoutes(['/admin/*']);
    middleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-cache, no-store, must-revalidate'
    );
    expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
    expect(next).toHaveBeenCalled();
  });

  it('does not set headers for non-matching routes', () => {
    req.path = '/public/page';
    const middleware = noCacheRoutes(['/admin/*']);
    middleware(req as Request, res as Response, next);

    expect(res.setHeader).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('uses no-store only when noStore flag is set', () => {
    const middleware = noCacheRoutes(['/admin/*'], true);
    middleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('calls next regardless of match', () => {
    const middleware = noCacheRoutes([]);
    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
