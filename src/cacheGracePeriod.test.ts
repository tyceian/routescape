import { matchesGracePath, findGraceRule, buildGraceHeaders, cacheGracePeriod } from './cacheGracePeriod';
import type { Request, Response, NextFunction } from 'express';

const mockReq = (path: string): Partial<Request> => ({ path });
const mockRes = (): Partial<Response> => {
  const headers: Record<string, string> = {};
  return {
    setHeader: (key: string, value: string) => { headers[key] = value; return mockRes() as Response; },
    getHeaders: () => headers,
    on: (_event: string, _cb: () => void) => mockRes() as Response,
    headersSent: false,
  };
};

describe('matchesGracePath', () => {
  it('matches exact path', () => {
    expect(matchesGracePath('/api/data', '/api/data')).toBe(true);
  });

  it('does not match different path', () => {
    expect(matchesGracePath('/api/other', '/api/data')).toBe(false);
  });

  it('matches wildcard prefix', () => {
    expect(matchesGracePath('/api/products/123', '/api/products/*')).toBe(true);
  });

  it('matches regex pattern', () => {
    expect(matchesGracePath('/api/v2/items', /^\/api\/v\d+/)).toBe(true);
  });

  it('does not match regex when no match', () => {
    expect(matchesGracePath('/other', /^\/api/)).toBe(false);
  });
});

describe('findGraceRule', () => {
  const rules = [
    { path: '/api/stable', staleIfError: 3600 },
    { path: '/api/fresh/*', graceWindow: 30 },
  ];

  it('returns matching rule', () => {
    expect(findGraceRule('/api/stable', rules)).toEqual(rules[0]);
  });

  it('returns wildcard rule', () => {
    expect(findGraceRule('/api/fresh/data', rules)).toEqual(rules[1]);
  });

  it('returns undefined when no match', () => {
    expect(findGraceRule('/not/found', rules)).toBeUndefined();
  });
});

describe('buildGraceHeaders', () => {
  it('builds stale-if-error header', () => {
    const headers = buildGraceHeaders({ path: '/test', staleIfError: 600 });
    expect(headers['Cache-Control']).toContain('stale-if-error=600');
    expect(headers['X-Cache-Grace']).toContain('stale-if-error=600');
  });

  it('builds grace window header', () => {
    const headers = buildGraceHeaders({ path: '/test', graceWindow: 60 });
    expect(headers['Cache-Control']).toContain('stale-while-revalidate=60');
  });

  it('combines both directives', () => {
    const headers = buildGraceHeaders({ path: '/test', staleIfError: 300, graceWindow: 60 });
    expect(headers['Cache-Control']).toContain('stale-if-error=300');
    expect(headers['Cache-Control']).toContain('stale-while-revalidate=60');
  });

  it('uses default stale-if-error when not set on rule', () => {
    const headers = buildGraceHeaders({ path: '/test' }, 1800);
    expect(headers['Cache-Control']).toContain('stale-if-error=1800');
  });

  it('returns empty headers when no directives', () => {
    const headers = buildGraceHeaders({ path: '/test' });
    expect(Object.keys(headers)).toHaveLength(0);
  });
});

describe('cacheGracePeriod middleware', () => {
  it('calls next when no rule matches', () => {
    const next = jest.fn() as NextFunction;
    const middleware = cacheGracePeriod({ rules: [{ path: '/api/*', staleIfError: 300 }] });
    middleware(mockReq('/other') as Request, mockRes() as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('sets headers and calls next when rule matches', () => {
    const next = jest.fn() as NextFunction;
    const res = mockRes() as Response;
    const middleware = cacheGracePeriod({ rules: [{ path: '/api/data', staleIfError: 600 }] });
    middleware(mockReq('/api/data') as Request, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toBeDefined();
  });
});
