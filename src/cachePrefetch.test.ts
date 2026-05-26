import { describe, it, expect, beforeEach } from 'vitest';
import {
  matchesPrefetchRoute,
  findPrefetchRule,
  buildLinkHeader,
  cachePrefetch,
  PrefetchRule,
} from './cachePrefetch';
import { Request, Response, NextFunction } from 'express';

const mockReq = (path: string): Partial<Request> => ({ path });
const mockRes = () => {
  const headers: Record<string, string> = {};
  return {
    getHeader: (key: string) => headers[key],
    setHeader: (key: string, val: string) => { headers[key] = val; },
    _headers: headers,
  } as unknown as Response;
};

describe('matchesPrefetchRoute', () => {
  it('matches exact string routes', () => {
    expect(matchesPrefetchRoute('/home', '/home')).toBe(true);
    expect(matchesPrefetchRoute('/about', '/home')).toBe(false);
  });

  it('matches wildcard routes', () => {
    expect(matchesPrefetchRoute('/api/users/1', '/api/users/*')).toBe(true);
    expect(matchesPrefetchRoute('/other', '/api/*')).toBe(false);
  });

  it('matches regex routes', () => {
    expect(matchesPrefetchRoute('/products/42', /^\/products\/\d+$/)).toBe(true);
    expect(matchesPrefetchRoute('/products/abc', /^\/products\/\d+$/)).toBe(false);
  });
});

describe('findPrefetchRule', () => {
  const rules: PrefetchRule[] = [
    { route: '/home', resources: ['/home.js'] },
    { route: '/api/*', resources: ['/api-client.js'] },
  ];

  it('returns matching rule', () => {
    expect(findPrefetchRule('/home', rules)?.resources).toContain('/home.js');
  });

  it('returns undefined for no match', () => {
    expect(findPrefetchRule('/unknown', rules)).toBeUndefined();
  });
});

describe('buildLinkHeader', () => {
  it('builds basic link header', () => {
    const rule: PrefetchRule = { route: '/home', resources: ['/app.js'] };
    expect(buildLinkHeader(rule)).toBe('</app.js>; rel=prefetch');
  });

  it('includes as and crossorigin attributes', () => {
    const rule: PrefetchRule = { route: '/', resources: ['/style.css'], as: 'style', crossorigin: true };
    expect(buildLinkHeader(rule)).toBe('</style.css>; rel=prefetch; as=style; crossorigin');
  });

  it('joins multiple resources', () => {
    const rule: PrefetchRule = { route: '/', resources: ['/a.js', '/b.js'] };
    expect(buildLinkHeader(rule)).toContain('</a.js>');
    expect(buildLinkHeader(rule)).toContain('</b.js>');
  });
});

describe('cachePrefetch middleware', () => {
  it('sets Link header when rule matches', () => {
    const middleware = cachePrefetch({ rules: [{ route: '/home', resources: ['/home.js'] }] });
    const req = mockReq('/home');
    const res = mockRes();
    const next: NextFunction = () => {};
    middleware(req as Request, res, next);
    expect(res.getHeader('Link')).toContain('/home.js');
  });

  it('appends to existing Link header', () => {
    const middleware = cachePrefetch({ rules: [{ route: '/home', resources: ['/home.js'] }] });
    const req = mockReq('/home');
    const res = mockRes();
    res.setHeader('Link', '</existing.js>; rel=preload');
    middleware(req as Request, res, () => {});
    expect(res.getHeader('Link')).toContain('existing');
    expect(res.getHeader('Link')).toContain('home.js');
  });

  it('calls next regardless of match', () => {
    const middleware = cachePrefetch({ rules: [] });
    let called = false;
    middleware(mockReq('/noop') as Request, mockRes(), () => { called = true; });
    expect(called).toBe(true);
  });
});
