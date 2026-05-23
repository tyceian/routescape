import { buildCacheKey, cacheKeyTransform } from './cacheKeyTransform';
import { Request, Response } from 'express';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    path: '/products',
    originalUrl: '/products',
    query: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

describe('buildCacheKey', () => {
  it('returns pathname by default', () => {
    const req = mockReq();
    expect(buildCacheKey(req)).toBe('/products');
  });

  it('includes full query string when includeQuery is true', () => {
    const req = mockReq({
      path: '/search',
      originalUrl: '/search?q=hello&page=2',
      query: { q: 'hello', page: '2' },
    });
    expect(buildCacheKey(req, { includeQuery: true })).toBe('/search?q=hello&page=2');
  });

  it('includes only specified query params', () => {
    const req = mockReq({
      path: '/search',
      originalUrl: '/search?q=hello&page=2&debug=true',
      query: { q: 'hello', page: '2', debug: 'true' },
    });
    const key = buildCacheKey(req, { includeQuery: ['q', 'page'] });
    expect(key).toBe('/search?q=hello&page=2');
  });

  it('ignores missing query params gracefully', () => {
    const req = mockReq({
      path: '/items',
      originalUrl: '/items',
      query: {},
    });
    const key = buildCacheKey(req, { includeQuery: ['sort'] });
    expect(key).toBe('/items');
  });

  it('appends specified headers to the key', () => {
    const req = mockReq({
      headers: { 'accept-language': 'en-US', 'x-region': 'eu' },
    });
    const key = buildCacheKey(req, { includeHeaders: ['accept-language', 'x-region'] });
    expect(key).toBe('/products[accept-language:en-US,x-region:eu]');
  });

  it('uses custom transform function when provided', () => {
    const req = mockReq();
    const key = buildCacheKey(req, { transform: (r) => `custom:${r.path}` });
    expect(key).toBe('custom:/products');
  });
});

describe('cacheKeyTransform middleware', () => {
  it('sets res.locals.cacheKey and calls next', () => {
    const req = mockReq();
    const locals: Record<string, any> = {};
    const res = { locals } as unknown as Response;
    const next = jest.fn();

    cacheKeyTransform()(req, res, next);

    expect(locals.cacheKey).toBe('/products');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('respects options passed to middleware factory', () => {
    const req = mockReq({
      headers: { 'accept-language': 'fr' },
    });
    const locals: Record<string, any> = {};
    const res = { locals } as unknown as Response;
    const next = jest.fn();

    cacheKeyTransform({ includeHeaders: ['accept-language'] })(req, res, next);

    expect(locals.cacheKey).toBe('/products[accept-language:fr]');
  });
});
