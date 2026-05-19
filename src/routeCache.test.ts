import { matchRoute, findMatchingRule, routeCache } from './routeCache';
import { CacheRule } from './types';
import { Request, Response } from 'express';

describe('matchRoute', () => {
  it('matches exact paths', () => {
    expect(matchRoute('/api/users', '/api/users')).toBe(true);
  });

  it('does not match different exact paths', () => {
    expect(matchRoute('/api/users', '/api/posts')).toBe(false);
  });

  it('matches wildcard prefix', () => {
    expect(matchRoute('/api/*', '/api/users')).toBe(true);
    expect(matchRoute('/api/*', '/api/users/123')).toBe(true);
  });

  it('does not match when prefix differs', () => {
    expect(matchRoute('/api/*', '/other/users')).toBe(false);
  });
});

describe('findMatchingRule', () => {
  const rules: CacheRule[] = [
    { path: '/static/*', directives: { maxAge: 3600, public: true } },
    { path: '/api/*', methods: ['GET'], directives: { noCache: true } },
    { path: '/api/data', directives: { maxAge: 60 } },
  ];

  it('returns first matching rule', () => {
    const rule = findMatchingRule(rules, '/static/image.png', 'GET');
    expect(rule?.directives.maxAge).toBe(3600);
  });

  it('respects method filter', () => {
    const rule = findMatchingRule(rules, '/api/users', 'POST');
    expect(rule).toBeUndefined();
  });

  it('matches rule without method restriction for any method', () => {
    const rule = findMatchingRule(rules, '/static/file.js', 'POST');
    expect(rule).toBeDefined();
  });

  it('returns undefined when no rule matches', () => {
    const rule = findMatchingRule(rules, '/unknown', 'GET');
    expect(rule).toBeUndefined();
  });
});

describe('routeCache middleware', () => {
  const makeReqRes = (path: string, method = 'GET') => {
    const headers: Record<string, string> = {};
    const req = { path, method } as Request;
    const res = {
      setHeader: (key: string, value: string) => { headers[key] = value; },
      getHeaders: () => headers,
    } as unknown as Response;
    return { req, res, headers };
  };

  it('sets Cache-Control header for matched route', () => {
    const middleware = routeCache({
      rules: [{ path: '/api/*', directives: { noStore: true } }],
    });
    const { req, res, headers } = makeReqRes('/api/data');
    const next = jest.fn();
    middleware(req, res, next);
    expect(headers['Cache-Control']).toBe('no-store');
    expect(next).toHaveBeenCalled();
  });

  it('applies default directives when no rule matches', () => {
    const middleware = routeCache({
      rules: [],
      defaultDirectives: { maxAge: 300, public: true },
    });
    const { req, res, headers } = makeReqRes('/anything');
    middleware(req, res, jest.fn());
    expect(headers['Cache-Control']).toContain('max-age=300');
  });

  it('does not set header when no rule and no default', () => {
    const middleware = routeCache({ rules: [] });
    const { req, res, headers } = makeReqRes('/anything');
    middleware(req, res, jest.fn());
    expect(headers['Cache-Control']).toBeUndefined();
  });
});
