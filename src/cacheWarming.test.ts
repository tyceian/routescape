import { Request, Response, NextFunction } from 'express';
import {
  registerWarmRoute,
  getWarmingRegistry,
  isWarmingRequest,
  buildWarmingHeaders,
  cacheWarming,
} from './cacheWarming';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    path: '/test',
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { _headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  return {
    _headers: headers,
    statusCode: 200,
    setHeader(k: string, v: string) {
      headers[k] = v;
    },
    end(..._args: any[]) {},
  } as any;
}

const next: NextFunction = jest.fn();

beforeEach(() => {
  getWarmingRegistry().clear();
  jest.clearAllMocks();
});

describe('isWarmingRequest', () => {
  it('returns true when x-cache-warm header is 1', () => {
    const req = mockReq({ headers: { 'x-cache-warm': '1' } });
    expect(isWarmingRequest(req)).toBe(true);
  });

  it('returns false when header is absent', () => {
    const req = mockReq();
    expect(isWarmingRequest(req)).toBe(false);
  });
});

describe('buildWarmingHeaders', () => {
  it('includes x-cache-warm and priority', () => {
    const headers = buildWarmingHeaders({ priority: 5 });
    expect(headers['x-cache-warm']).toBe('1');
    expect(headers['x-warm-priority']).toBe('5');
  });

  it('omits priority when not set', () => {
    const headers = buildWarmingHeaders({});
    expect(headers['x-warm-priority']).toBeUndefined();
  });
});

describe('registerWarmRoute', () => {
  it('stores entry in registry', () => {
    registerWarmRoute('/api/data', { priority: 1 });
    expect(getWarmingRegistry().has('/api/data')).toBe(true);
  });
});

describe('cacheWarming middleware', () => {
  it('calls next for non-warming requests', () => {
    const mw = cacheWarming();
    const req = mockReq();
    const res = mockRes();
    mw(req, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('sets warmed headers on end for warming requests', () => {
    const onWarm = jest.fn();
    const mw = cacheWarming({ onWarm });
    const req = mockReq({ headers: { 'x-cache-warm': '1' }, path: '/warm' });
    const res = mockRes();
    registerWarmRoute('/warm', { priority: 2 });
    mw(req, res as any, next);
    (res as any).end();
    expect(res._headers['x-cache-warmed']).toBe('true');
    expect(res._headers['x-warm-timestamp']).toBeDefined();
    expect(onWarm).toHaveBeenCalledWith('/warm', 200);
  });
});
