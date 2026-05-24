import { cacheTtlOverride, matchesTtlPath, findTtlRule, buildTtlCacheControl } from './cacheTtlOverride';
import type { Request, Response } from 'express';

const mockReq = (path: string, method = 'GET'): Partial<Request> => ({ path, method });

const mockRes = (): Partial<Response> & { _headers: Record<string, string> } => {
  const headers: Record<string, string> = {};
  return {
    _headers: headers,
    getHeader: (key: string) => headers[key],
    setHeader(key: string, val: string) { headers[key] = val; return this as unknown as Response; },
    headersSent: false,
    send: jest.fn().mockReturnThis(),
    on: jest.fn(),
  } as unknown as Partial<Response> & { _headers: Record<string, string> };
};

describe('matchesTtlPath', () => {
  it('matches exact string path', () => {
    expect(matchesTtlPath('/api/products', '/api/products')).toBe(true);
  });

  it('matches child paths of string prefix', () => {
    expect(matchesTtlPath('/api/products', '/api/products/123')).toBe(true);
  });

  it('does not match unrelated paths', () => {
    expect(matchesTtlPath('/api/products', '/api/users')).toBe(false);
  });

  it('matches regex path', () => {
    expect(matchesTtlPath(/^\/api\/v\d+/, '/api/v2/items')).toBe(true);
  });

  it('does not match regex when no match', () => {
    expect(matchesTtlPath(/^\/api\/v\d+/, '/api/items')).toBe(false);
  });
});

describe('findTtlRule', () => {
  const rules = [
    { path: '/api/static', ttl: 3600 },
    { path: '/api/dynamic', ttl: 60, methods: ['GET'] },
  ];

  it('returns matching rule', () => {
    const rule = findTtlRule(mockReq('/api/static') as Request, rules);
    expect(rule?.ttl).toBe(3600);
  });

  it('returns undefined when no match', () => {
    expect(findTtlRule(mockReq('/other') as Request, rules)).toBeUndefined();
  });

  it('respects method filter', () => {
    expect(findTtlRule(mockReq('/api/dynamic', 'POST') as Request, rules)).toBeUndefined();
    expect(findTtlRule(mockReq('/api/dynamic', 'GET') as Request, rules)?.ttl).toBe(60);
  });
});

describe('buildTtlCacheControl', () => {
  it('builds max-age only', () => {
    expect(buildTtlCacheControl({ path: '/', ttl: 300 })).toBe('max-age=300');
  });

  it('includes s-maxage when provided', () => {
    expect(buildTtlCacheControl({ path: '/', ttl: 300, sMaxAge: 600 })).toBe('max-age=300, s-maxage=600');
  });
});

describe('cacheTtlOverride middleware', () => {
  it('sets Cache-Control header on send', () => {
    const req = mockReq('/api/static') as Request;
    const res = mockRes() as unknown as Response;
    const next = jest.fn();

    cacheTtlOverride({ rules: [{ path: '/api/static', ttl: 3600 }] })(req, res, next);
    expect(next).toHaveBeenCalled();

    (res.send as jest.Mock).getMockImplementation?.();
    res.send('body');
    expect(res.getHeader('Cache-Control')).toBe('max-age=3600');
    expect(res.getHeader('X-TTL-Override')).toBe('3600');
  });

  it('calls onOverride callback', () => {
    const req = mockReq('/api/static') as Request;
    const res = mockRes() as unknown as Response;
    const next = jest.fn();
    const onOverride = jest.fn();

    cacheTtlOverride({ rules: [{ path: '/api/static', ttl: 120 }], onOverride })(req, res, next);
    res.send('body');
    expect(onOverride).toHaveBeenCalledWith(req, 120);
  });

  it('skips when no rule matches', () => {
    const req = mockReq('/other') as Request;
    const res = mockRes() as unknown as Response;
    const next = jest.fn();

    cacheTtlOverride({ rules: [{ path: '/api/static', ttl: 3600 }] })(req, res, next);
    expect(next).toHaveBeenCalled();
    res.send('body');
    expect(res.getHeader('Cache-Control')).toBeUndefined();
  });
});
