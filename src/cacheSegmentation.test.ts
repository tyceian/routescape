import { matchesSegmentRoute, buildSegmentKey, findSegmentRule, cacheSegmentation, SegmentRule } from './cacheSegmentation';
import { Request, Response } from 'express';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/products',
    method: 'GET',
    headers: {},
    cookies: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const headers: Record<string, string> = {};
  return {
    setHeader: (k: string, v: string) => { headers[k] = v; },
    getHeaders: () => headers,
    _headers: headers,
  } as unknown as Response;
}

describe('matchesSegmentRoute', () => {
  it('matches exact path', () => {
    expect(matchesSegmentRoute('/api/products', '/api/products')).toBe(true);
  });

  it('matches wildcard prefix', () => {
    expect(matchesSegmentRoute('/api/products/123', '/api/products*')).toBe(true);
  });

  it('matches regex', () => {
    expect(matchesSegmentRoute('/api/items/42', /^\/api\/items\/\d+$/)).toBe(true);
  });

  it('does not match different path', () => {
    expect(matchesSegmentRoute('/api/orders', '/api/products')).toBe(false);
  });
});

describe('buildSegmentKey', () => {
  it('segments by method', () => {
    const rule: SegmentRule = { route: '/api/products', segmentBy: ['method'] };
    const req = mockReq({ method: 'POST' } as any);
    expect(buildSegmentKey(req, rule)).toBe('method=POST');
  });

  it('segments by cookie keys', () => {
    const rule: SegmentRule = { route: '/api/products', segmentBy: ['cookie'], cookieKeys: ['locale'] };
    const req = mockReq({ cookies: { locale: 'en-US' } } as any);
    expect(buildSegmentKey(req, rule)).toBe('cookie:locale=en-US');
  });

  it('segments by header keys', () => {
    const rule: SegmentRule = { route: '/api/products', segmentBy: ['header'], headerKeys: ['accept-language'] };
    const req = mockReq({ headers: { 'accept-language': 'fr' } } as any);
    expect(buildSegmentKey(req, rule)).toBe('header:accept-language=fr');
  });

  it('segments by query keys', () => {
    const rule: SegmentRule = { route: '/api/products', segmentBy: ['query'], queryKeys: ['region'] };
    const req = mockReq({ query: { region: 'eu' } } as any);
    expect(buildSegmentKey(req, rule)).toBe('query:region=eu');
  });

  it('combines multiple segment types', () => {
    const rule: SegmentRule = {
      route: '/api/products',
      segmentBy: ['method', 'query'],
      queryKeys: ['version'],
    };
    const req = mockReq({ method: 'GET', query: { version: 'v2' } } as any);
    expect(buildSegmentKey(req, rule)).toBe('method=GET;query:version=v2');
  });
});

describe('findSegmentRule', () => {
  const rules: SegmentRule[] = [
    { route: '/api/products', segmentBy: ['query'], queryKeys: ['lang'] },
    { route: '/api/users*', segmentBy: ['cookie'], cookieKeys: ['session'] },
  ];

  it('finds matching rule', () => {
    expect(findSegmentRule('/api/products', rules)).toBe(rules[0]);
  });

  it('finds wildcard rule', () => {
    expect(findSegmentRule('/api/users/123', rules)).toBe(rules[1]);
  });

  it('returns undefined for no match', () => {
    expect(findSegmentRule('/api/orders', rules)).toBeUndefined();
  });
});

describe('cacheSegmentation middleware', () => {
  it('sets segment header when rule matches', () => {
    const middleware = cacheSegmentation({
      rules: [{ route: '/api/products', segmentBy: ['query'], queryKeys: ['lang'] }],
    });
    const req = mockReq({ path: '/api/products', query: { lang: 'de' } } as any);
    const res = mockRes();
    const next = jest.fn();
    middleware(req, res, next);
    expect((res as any)._headers['X-Cache-Segment']).toBe('query:lang=de');
    expect(next).toHaveBeenCalled();
  });

  it('does not set header when no rule matches', () => {
    const middleware = cacheSegmentation({
      rules: [{ route: '/api/products', segmentBy: ['method'] }],
    });
    const req = mockReq({ path: '/api/orders' } as any);
    const res = mockRes();
    const next = jest.fn();
    middleware(req, res, next);
    expect((res as any)._headers['X-Cache-Segment']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('respects custom header name', () => {
    const middleware = cacheSegmentation({
      rules: [{ route: '/api/products', segmentBy: ['method'] }],
      headerName: 'X-Segment-Key',
    });
    const req = mockReq({ path: '/api/products', method: 'GET' } as any);
    const res = mockRes();
    middleware(req, res, jest.fn());
    expect((res as any)._headers['X-Segment-Key']).toBe('method=GET');
  });
});
