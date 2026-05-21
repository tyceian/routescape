import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseIfModifiedSince, isNotModified, conditionalGet } from './conditionalGet';
import { Request, Response, NextFunction } from 'express';

const makeReq = (headers: Record<string, string> = {}, method = 'GET'): Partial<Request> => ({
  method,
  headers: headers as any,
});

const makeRes = (locals: Record<string, unknown> = {}): Partial<Response> => {
  const res: any = {
    locals,
    status: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return res;
};

describe('parseIfModifiedSince', () => {
  it('returns null when header is absent', () => {
    expect(parseIfModifiedSince(makeReq() as Request)).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(parseIfModifiedSince(makeReq({ 'if-modified-since': 'not-a-date' }) as Request)).toBeNull();
  });

  it('returns a Date for a valid date string', () => {
    const date = new Date('2024-01-15T10:00:00Z');
    const result = parseIfModifiedSince(
      makeReq({ 'if-modified-since': date.toUTCString() }) as Request
    );
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBe(date.getTime());
  });
});

describe('isNotModified', () => {
  it('returns false when no conditional headers are present', () => {
    expect(isNotModified(makeReq() as Request, new Date(), '"abc"')).toBe(false);
  });

  it('returns true when If-None-Match matches etag', () => {
    const req = makeReq({ 'if-none-match': '"abc123"' }) as Request;
    expect(isNotModified(req, null, '"abc123"')).toBe(true);
  });

  it('returns true when If-None-Match is wildcard', () => {
    const req = makeReq({ 'if-none-match': '*' }) as Request;
    expect(isNotModified(req, null, '"xyz"')).toBe(true);
  });

  it('returns false when etag does not match', () => {
    const req = makeReq({ 'if-none-match': '"old"' }) as Request;
    expect(isNotModified(req, null, '"new"')).toBe(false);
  });

  it('returns true when resource not modified since given date', () => {
    const lastModified = new Date('2024-01-01T00:00:00Z');
    const ifModifiedSince = new Date('2024-06-01T00:00:00Z');
    const req = makeReq({ 'if-modified-since': ifModifiedSince.toUTCString() }) as Request;
    expect(isNotModified(req, lastModified, null)).toBe(true);
  });

  it('returns false when resource was modified after If-Modified-Since', () => {
    const lastModified = new Date('2024-06-15T00:00:00Z');
    const ifModifiedSince = new Date('2024-01-01T00:00:00Z');
    const req = makeReq({ 'if-modified-since': ifModifiedSince.toUTCString() }) as Request;
    expect(isNotModified(req, lastModified, null)).toBe(false);
  });
});

describe('conditionalGet middleware', () => {
  it('calls next and skips non-GET methods', () => {
    const middleware = conditionalGet();
    const req = makeReq({}, 'POST') as Request;
    const res = makeRes() as Response;
    const next = vi.fn() as NextFunction;
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('sends 304 when etag matches', () => {
    const middleware = conditionalGet();
    const req = makeReq({ 'if-none-match': '"match"' }) as Request;
    const res = makeRes({ etag: '"match"' }) as Response;
    const next: NextFunction = vi.fn();
    middleware(req, res, next);
    (res as any).json({ data: 'hello' });
    expect((res as any).status).toHaveBeenCalledWith(304);
  });

  it('proceeds normally when etag does not match', () => {
    const middleware = conditionalGet();
    const req = makeReq({ 'if-none-match': '"old"' }) as Request;
    const res = makeRes({ etag: '"new"' }) as Response;
    const next: NextFunction = vi.fn();
    middleware(req, res, next);
    (res as any).json({ data: 'hello' });
    expect((res as any).status).not.toHaveBeenCalledWith(304);
  });
});
