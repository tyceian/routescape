import { buildCoalesceKey, isCoalescing, registerPending, resolvePending } from './requestCoalescing';
import { Request, Response } from 'express';

function mockReq(method = 'GET', path = '/api/data', query: Record<string, string> = {}, headers: Record<string, string> = {}): Partial<Request> {
  return { method, path, query, headers } as any;
}

function mockRes(): Partial<Response> {
  const headers: Record<string, string> = {};
  return {
    setHeader: jest.fn((k: string, v: string) => { headers[k] = v; }),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as any;
}

describe('buildCoalesceKey', () => {
  it('returns method:path when no keyFields', () => {
    const req = mockReq('GET', '/api/items');
    expect(buildCoalesceKey(req as Request)).toBe('GET:/api/items');
  });

  it('appends query fields when keyFields provided', () => {
    const req = mockReq('GET', '/api/items', { locale: 'en' });
    expect(buildCoalesceKey(req as Request, ['locale'])).toBe('GET:/api/items?locale=en');
  });

  it('falls back to empty string for missing fields', () => {
    const req = mockReq('GET', '/api/items', {});
    expect(buildCoalesceKey(req as Request, ['locale'])).toBe('GET:/api/items?locale=');
  });
});

describe('isCoalescing', () => {
  it('returns false for unknown keys', () => {
    expect(isCoalescing('GET:/unknown')).toBe(false);
  });

  it('returns true after registering a pending request', () => {
    const res = mockRes();
    registerPending('GET:/test-coalesce', { res: res as Response, resolve: jest.fn(), reject: jest.fn() });
    expect(isCoalescing('GET:/test-coalesce')).toBe(true);
  });
});

describe('resolvePending', () => {
  it('sends response to all waiting requests and clears the key', () => {
    const res1 = mockRes();
    const res2 = mockRes();
    const key = 'GET:/coalesce-resolve';

    registerPending(key, { res: res1 as Response, resolve: jest.fn(), reject: jest.fn() });
    registerPending(key, { res: res2 as Response, resolve: jest.fn(), reject: jest.fn() });

    resolvePending(key, 'hello', 200, { 'x-cache': 'HIT' });

    expect((res1.status as jest.Mock)).toHaveBeenCalledWith(200);
    expect((res1.send as jest.Mock)).toHaveBeenCalledWith('hello');
    expect((res2.send as jest.Mock)).toHaveBeenCalledWith('hello');
    expect(isCoalescing(key)).toBe(false);
  });

  it('does nothing for a key with no waiters', () => {
    expect(() => resolvePending('GET:/no-waiters', 'ok', 200, {})).not.toThrow();
  });
});
