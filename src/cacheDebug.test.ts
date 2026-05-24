import { buildDebugHeaders, attachDebugInfo, getDebugInfo, cacheDebug } from './cacheDebug';
import { Request, Response, NextFunction } from 'express';

function mockRes(): Partial<Response> {
  const headers: Record<string, string> = {};
  return {
    setHeader: (key: string, value: string) => { headers[key] = value; return mockRes() as Response; },
    getHeader: (key: string) => headers[key],
    headersSent: false,
    end: jest.fn(),
    __headers: headers,
  } as any;
}

function mockReq(path = '/test'): Partial<Request> {
  return { path } as Partial<Request>;
}

describe('buildDebugHeaders', () => {
  it('sets HIT status', () => {
    const headers = buildDebugHeaders({ hit: true }, 'X-Cache-Debug');
    expect(headers['X-Cache-Debug-Status']).toBe('HIT');
  });

  it('sets MISS status', () => {
    const headers = buildDebugHeaders({ hit: false }, 'X-Cache-Debug');
    expect(headers['X-Cache-Debug-Status']).toBe('MISS');
  });

  it('includes key when provided', () => {
    const headers = buildDebugHeaders({ hit: true, key: 'my-key' }, 'X-Cache-Debug');
    expect(headers['X-Cache-Debug-Key']).toBe('my-key');
  });

  it('includes age when provided', () => {
    const headers = buildDebugHeaders({ hit: true, age: 42 }, 'X-Cache-Debug');
    expect(headers['X-Cache-Debug-Age']).toBe('42');
  });

  it('includes rule when provided', () => {
    const headers = buildDebugHeaders({ hit: false, rule: 'no-store' }, 'X-Cache-Debug');
    expect(headers['X-Cache-Debug-Rule']).toBe('no-store');
  });

  it('omits optional fields when not provided', () => {
    const headers = buildDebugHeaders({ hit: true }, 'X-Cache-Debug');
    expect(headers['X-Cache-Debug-Key']).toBeUndefined();
    expect(headers['X-Cache-Debug-Age']).toBeUndefined();
  });

  it('respects custom prefix', () => {
    const headers = buildDebugHeaders({ hit: true }, 'X-Surrogate-Debug');
    expect(headers['X-Surrogate-Debug-Status']).toBe('HIT');
  });
});

describe('attachDebugInfo / getDebugInfo', () => {
  it('stores and retrieves debug info on res', () => {
    const res = mockRes() as Response;
    const info = { hit: true, key: 'test-key' };
    attachDebugInfo(res, info);
    expect(getDebugInfo(res)).toEqual(info);
  });

  it('returns undefined when no info attached', () => {
    const res = mockRes() as Response;
    expect(getDebugInfo(res)).toBeUndefined();
  });
});

describe('cacheDebug middleware', () => {
  it('calls next when disabled', () => {
    const middleware = cacheDebug({ enabled: false });
    const req = mockReq() as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next when enabled', () => {
    const middleware = cacheDebug({ enabled: true });
    const req = mockReq() as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('attaches debug headers on end when info is present', () => {
    const middleware = cacheDebug({ includeTimestamp: false });
    const req = mockReq('/api/data') as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    middleware(req, res, next);
    attachDebugInfo(res, { hit: true, key: 'api-key' });
    (res as any).end();

    expect((res as any).__headers['X-Cache-Debug-Status']).toBe('HIT');
    expect((res as any).__headers['X-Cache-Debug-Key']).toBe('api-key');
    expect((res as any).__headers['X-Cache-Debug-Route']).toBe('/api/data');
  });
});
