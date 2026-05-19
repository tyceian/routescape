import { buildCacheControlHeader, cacheControl, CacheRule } from './cacheControl';
import { Request, Response, NextFunction } from 'express';

describe('buildCacheControlHeader', () => {
  it('returns no-store when noStore is true', () => {
    expect(buildCacheControlHeader({ noStore: true, maxAge: 300 })).toBe('no-store');
  });

  it('builds a public max-age header', () => {
    const rule: CacheRule = { public: true, maxAge: 3600 };
    expect(buildCacheControlHeader(rule)).toBe('public, max-age=3600');
  });

  it('builds a private no-cache header', () => {
    const rule: CacheRule = { private: true, noCache: true };
    expect(buildCacheControlHeader(rule)).toBe('no-cache, private');
  });

  it('includes s-maxage and must-revalidate', () => {
    const rule: CacheRule = { public: true, maxAge: 60, sMaxAge: 120, mustRevalidate: true };
    expect(buildCacheControlHeader(rule)).toBe('public, max-age=60, s-maxage=120, must-revalidate');
  });

  it('includes immutable directive', () => {
    const rule: CacheRule = { public: true, maxAge: 31536000, immutable: true };
    expect(buildCacheControlHeader(rule)).toBe('public, max-age=31536000, immutable');
  });

  it('returns empty string for empty rule', () => {
    expect(buildCacheControlHeader({})).toBe('');
  });
});

describe('cacheControl middleware', () => {
  const mockNext: NextFunction = jest.fn();

  const mockRes = () => {
    const headers: Record<string, string> = {};
    return {
      setHeader: (key: string, val: string) => { headers[key] = val; },
      _headers: headers,
    } as unknown as Response & { _headers: Record<string, string> };
  };

  it('sets Cache-Control header and calls next', () => {
    const res = mockRes();
    const middleware = cacheControl({ public: true, maxAge: 600 });
    middleware({} as Request, res, mockNext);
    expect((res as any)._headers['Cache-Control']).toBe('public, max-age=600');
    expect(mockNext).toHaveBeenCalled();
  });

  it('does not set header when rule produces empty string', () => {
    const res = mockRes();
    const middleware = cacheControl({});
    middleware({} as Request, res, mockNext);
    expect((res as any)._headers['Cache-Control']).toBeUndefined();
  });
});
