import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  matchesInvalidationPath,
  resolveInvalidationTargets,
  buildInvalidationHeaders,
  cacheInvalidation,
  InvalidationRule,
} from './cacheInvalidation';
import { Request, Response } from 'express';

const mockReq = (method: string, path: string): Partial<Request> => ({
  method,
  path,
});

const mockRes = (): Partial<Response> => {
  const handlers: Record<string, () => void> = {};
  return {
    statusCode: 200,
    setHeader: vi.fn(),
    on: vi.fn((event: string, cb: () => void) => {
      handlers[event] = cb;
    }),
    emit: vi.fn((event: string) => {
      if (handlers[event]) handlers[event]();
    }),
  } as unknown as Partial<Response>;
};

const rules: InvalidationRule[] = [
  {
    methods: ['POST', 'PUT', 'DELETE'],
    path: '/articles',
    invalidates: ['/articles', '/feed'],
  },
  {
    methods: ['DELETE'],
    path: /^\/users\/\d+$/,
    invalidates: ['/users'],
  },
];

describe('matchesInvalidationPath', () => {
  it('matches exact string paths', () => {
    expect(matchesInvalidationPath('/articles', '/articles')).toBe(true);
    expect(matchesInvalidationPath('/other', '/articles')).toBe(false);
  });

  it('matches regex patterns', () => {
    expect(matchesInvalidationPath('/users/42', /^\/users\/\d+$/)).toBe(true);
    expect(matchesInvalidationPath('/users/abc', /^\/users\/\d+$/)).toBe(false);
  });
});

describe('resolveInvalidationTargets', () => {
  it('returns targets for matching method and path', () => {
    const req = mockReq('POST', '/articles') as Request;
    const targets = resolveInvalidationTargets(req, rules);
    expect(targets).toContain('/articles');
    expect(targets).toContain('/feed');
  });

  it('returns empty array when method does not match', () => {
    const req = mockReq('GET', '/articles') as Request;
    expect(resolveInvalidationTargets(req, rules)).toEqual([]);
  });

  it('returns targets for regex path rules', () => {
    const req = mockReq('DELETE', '/users/7') as Request;
    const targets = resolveInvalidationTargets(req, rules);
    expect(targets).toContain('/users');
  });

  it('deduplicates targets', () => {
    const dupeRules: InvalidationRule[] = [
      { methods: ['POST'], path: '/x', invalidates: ['/cache'] },
      { methods: ['POST'], path: '/x', invalidates: ['/cache'] },
    ];
    const req = mockReq('POST', '/x') as Request;
    const targets = resolveInvalidationTargets(req, dupeRules);
    expect(targets.filter((t) => t === '/cache').length).toBe(1);
  });
});

describe('buildInvalidationHeaders', () => {
  it('joins targets with comma', () => {
    expect(buildInvalidationHeaders(['/a', '/b'])).toBe('/a, /b');
  });

  it('returns single target as-is', () => {
    expect(buildInvalidationHeaders(['/only'])).toBe('/only');
  });
});

describe('cacheInvalidation middleware', () => {
  it('calls next and sets header on finish for matching request', () => {
    const req = mockReq('DELETE', '/articles') as Request;
    const res = mockRes() as Response;
    const next = vi.fn();

    cacheInvalidation({ rules })(req, res, next);
    expect(next).toHaveBeenCalled();
    (res as any).emit('finish');
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Cache-Invalidate',
      expect.stringContaining('/articles')
    );
  });

  it('does not set header when status is not 2xx', () => {
    const req = mockReq('DELETE', '/articles') as Request;
    const res = mockRes() as Response;
    (res as any).statusCode = 500;
    const next = vi.fn();

    cacheInvalidation({ rules })(req, res, next);
    (res as any).emit('finish');
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('calls onInvalidate callback with resolved targets', () => {
    const onInvalidate = vi.fn();
    const req = mockReq('POST', '/articles') as Request;
    const res = mockRes() as Response;
    const next = vi.fn();

    cacheInvalidation({ rules, onInvalidate })(req, res, next);
    (res as any).emit('finish');
    expect(onInvalidate).toHaveBeenCalledWith(
      expect.arrayContaining(['/articles', '/feed']),
      req
    );
  });
});
