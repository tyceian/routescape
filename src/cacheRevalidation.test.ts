import {
  matchesRevalidationPath,
  findRevalidationRule,
  buildRevalidationHeaders,
  cacheRevalidation,
} from './cacheRevalidation';
import { RevalidationRule } from './types';
import { Request, Response } from 'express';

const mockReq = (path: string): Partial<Request> => ({ path });
const mockRes = (): Partial<Response> => {
  const headers: Record<string, string> = {};
  return {
    setHeader: (k: string, v: string) => { headers[k] = v; return mockRes() as Response; },
    getHeader: (k: string) => headers[k],
    on: jest.fn(),
    _headers: headers,
  } as any;
};

describe('matchesRevalidationPath', () => {
  it('matches exact path', () => {
    expect(matchesRevalidationPath('/api/data', '/api/data')).toBe(true);
  });

  it('does not match different path', () => {
    expect(matchesRevalidationPath('/api/other', '/api/data')).toBe(false);
  });

  it('matches wildcard prefix', () => {
    expect(matchesRevalidationPath('/api/data/123', '/api/data/*')).toBe(true);
  });

  it('matches regex pattern', () => {
    expect(matchesRevalidationPath('/products/42', /^\/products\/\d+$/)).toBe(true);
  });
});

describe('findRevalidationRule', () => {
  const rules: RevalidationRule[] = [
    { path: '/api/*', maxAge: 60, staleWhileRevalidate: 30 },
    { path: '/static', maxAge: 3600, mustRevalidate: true },
  ];

  it('returns matching rule', () => {
    expect(findRevalidationRule('/api/users', rules)).toEqual(rules[0]);
  });

  it('returns undefined for no match', () => {
    expect(findRevalidationRule('/other', rules)).toBeUndefined();
  });
});

describe('buildRevalidationHeaders', () => {
  it('builds stale-while-revalidate header', () => {
    const rule: RevalidationRule = { path: '/api', maxAge: 60, staleWhileRevalidate: 30 };
    const headers = buildRevalidationHeaders(rule);
    expect(headers['Cache-Control']).toBe('max-age=60, stale-while-revalidate=30');
  });

  it('appends stale-if-error', () => {
    const rule: RevalidationRule = { path: '/api', maxAge: 60, staleWhileRevalidate: 30, staleIfError: 86400 };
    const headers = buildRevalidationHeaders(rule);
    expect(headers['Cache-Control']).toContain('stale-if-error=86400');
  });

  it('appends must-revalidate', () => {
    const rule: RevalidationRule = { path: '/data', maxAge: 120, mustRevalidate: true };
    const headers = buildRevalidationHeaders(rule);
    expect(headers['Cache-Control']).toContain('must-revalidate');
  });

  it('appends proxy-revalidate', () => {
    const rule: RevalidationRule = { path: '/data', maxAge: 120, proxyRevalidate: true };
    const headers = buildRevalidationHeaders(rule);
    expect(headers['Cache-Control']).toContain('proxy-revalidate');
  });
});

describe('cacheRevalidation middleware', () => {
  it('calls next when no rule matches', () => {
    const mw = cacheRevalidation({ rules: [{ path: '/api', maxAge: 60 }] });
    const req = mockReq('/other');
    const res = mockRes();
    const next = jest.fn();
    mw(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('sets headers and calls next on match', () => {
    const mw = cacheRevalidation({ rules: [{ path: '/api', maxAge: 60, staleWhileRevalidate: 15 }] });
    const req = mockReq('/api');
    const res = mockRes();
    const next = jest.fn();
    mw(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
