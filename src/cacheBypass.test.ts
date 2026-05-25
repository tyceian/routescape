import { cacheBypass, hasBypassHeader, hasBypassQueryParam, hasBypassCookie, shouldBypass } from './cacheBypass';
import { Request, Response } from 'express';

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: {},
    query: {},
    ...overrides,
  } as unknown as Request);

const makeRes = (): { headers: Record<string, string>; setHeader: jest.Mock; getHeader: jest.Mock } => {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: jest.fn((k: string, v: string) => { headers[k] = v; }),
    getHeader: jest.fn((k: string) => headers[k]),
  };
};

describe('hasBypassHeader', () => {
  it('returns true when bypass header is set to 1', () => {
    const req = makeReq({ headers: { 'x-cache-bypass': '1' } });
    expect(hasBypassHeader(req, ['x-cache-bypass'])).toBe(true);
  });

  it('returns true when bypass header is set to true', () => {
    const req = makeReq({ headers: { 'x-no-cache': 'true' } });
    expect(hasBypassHeader(req, ['x-no-cache'])).toBe(true);
  });

  it('returns false when header is absent', () => {
    const req = makeReq({ headers: {} });
    expect(hasBypassHeader(req, ['x-cache-bypass'])).toBe(false);
  });
});

describe('hasBypassQueryParam', () => {
  it('returns true when bypass param is present', () => {
    const req = makeReq({ query: { nocache: '' } } as any);
    expect(hasBypassQueryParam(req, ['nocache'])).toBe(true);
  });

  it('returns false when no bypass param', () => {
    const req = makeReq({ query: { page: '1' } } as any);
    expect(hasBypassQueryParam(req, ['nocache'])).toBe(false);
  });
});

describe('hasBypassCookie', () => {
  it('detects bypass cookie in cookie header', () => {
    const req = makeReq({ headers: { cookie: 'session=abc; bypass_cache=1' } });
    expect(hasBypassCookie(req, ['bypass_cache'])).toBe(true);
  });

  it('returns false when cookie not present', () => {
    const req = makeReq({ headers: { cookie: 'session=abc' } });
    expect(hasBypassCookie(req, ['bypass_cache'])).toBe(false);
  });
});

describe('cacheBypass middleware', () => {
  it('sets no-store headers when bypass header is present', () => {
    const req = makeReq({ headers: { 'x-cache-bypass': '1' } });
    const res = makeRes();
    const next = jest.fn();
    cacheBypass()(req, res as any, next);
    expect(res.headers['Cache-Control']).toBe('no-store, no-cache');
    expect(res.headers['x-cache-bypassed']).toBe('1');
    expect(next).toHaveBeenCalled();
  });

  it('does not set headers when no bypass signal', () => {
    const req = makeReq({ headers: {}, query: {} } as any);
    const res = makeRes();
    const next = jest.fn();
    cacheBypass()(req, res as any, next);
    expect(res.headers['Cache-Control']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('respects custom bypassResponseHeader option', () => {
    const req = makeReq({ headers: { 'x-cache-bypass': '1' } });
    const res = makeRes();
    const next = jest.fn();
    cacheBypass({ bypassResponseHeader: 'x-custom-bypass' })(req, res as any, next);
    expect(res.headers['x-custom-bypass']).toBe('1');
  });
});
