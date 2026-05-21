import { buildSurrogateHeader, mergeSurrogateHeaders, surrogateCacheControl } from './surrogateCacheControl';
import { createRequest, createResponse } from 'node-mocks-http';

describe('buildSurrogateHeader', () => {
  it('builds a basic max-age directive', () => {
    expect(buildSurrogateHeader({ path: '/', maxAge: 300 })).toBe('max-age=300');
  });

  it('includes stale-while-revalidate when provided', () => {
    expect(buildSurrogateHeader({ path: '/', maxAge: 600, staleWhileRevalidate: 60 }))
      .toBe('max-age=600, stale-while-revalidate=60');
  });

  it('includes stale-if-error when provided', () => {
    expect(buildSurrogateHeader({ path: '/', maxAge: 600, staleIfError: 3600 }))
      .toBe('max-age=600, stale-if-error=3600');
  });

  it('returns no-store when noStore is true', () => {
    expect(buildSurrogateHeader({ path: '/', noStore: true })).toBe('no-store');
  });

  it('returns empty string when no directives given', () => {
    expect(buildSurrogateHeader({ path: '/' })).toBe('');
  });
});

describe('mergeSurrogateHeaders', () => {
  it('returns incoming when existing is empty', () => {
    expect(mergeSurrogateHeaders('', 'max-age=300')).toBe('max-age=300');
  });

  it('returns existing when incoming is empty', () => {
    expect(mergeSurrogateHeaders('max-age=300', '')).toBe('max-age=300');
  });

  it('takes the minimum max-age', () => {
    expect(mergeSurrogateHeaders('max-age=600', 'max-age=300')).toBe('max-age=300');
  });

  it('keeps other directives from incoming', () => {
    const result = mergeSurrogateHeaders('max-age=600', 'max-age=300, stale-while-revalidate=60');
    expect(result).toBe('max-age=300, stale-while-revalidate=60');
  });
});

describe('surrogateCacheControl middleware', () => {
  it('sets Surrogate-Control header for matching route', () => {
    const middleware = surrogateCacheControl({
      rules: [{ path: '/api/data', maxAge: 120 }],
    });
    const req = createRequest({ method: 'GET', path: '/api/data' });
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.getHeader('Surrogate-Control')).toBe('max-age=120');
    expect(next).toHaveBeenCalled();
  });

  it('does not set header for non-matching route', () => {
    const middleware = surrogateCacheControl({
      rules: [{ path: '/api/data', maxAge: 120 }],
    });
    const req = createRequest({ method: 'GET', path: '/other' });
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.getHeader('Surrogate-Control')).toBeUndefined();
  });

  it('supports regex path matching', () => {
    const middleware = surrogateCacheControl({
      rules: [{ path: /^\/products\/\d+$/, maxAge: 300 }],
    });
    const req = createRequest({ method: 'GET', path: '/products/42' });
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.getHeader('Surrogate-Control')).toBe('max-age=300');
  });

  it('respects method filtering', () => {
    const middleware = surrogateCacheControl({
      rules: [{ path: '/api/data', maxAge: 120, methods: ['GET'] }],
    });
    const req = createRequest({ method: 'POST', path: '/api/data' });
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.getHeader('Surrogate-Control')).toBeUndefined();
  });
});
