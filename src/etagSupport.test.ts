import { generateETag, isETagMatch } from './etagSupport';
import { Request } from 'express';

describe('generateETag', () => {
  it('generates a weak ETag by default', () => {
    const etag = generateETag('hello world');
    expect(etag).toMatch(/^W\/"[a-f0-9]{16}"$/);
  });

  it('generates a strong ETag when weak is false', () => {
    const etag = generateETag('hello world', false);
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
  });

  it('produces the same ETag for the same content', () => {
    const a = generateETag('consistent content');
    const b = generateETag('consistent content');
    expect(a).toBe(b);
  });

  it('produces different ETags for different content', () => {
    const a = generateETag('foo');
    const b = generateETag('bar');
    expect(a).not.toBe(b);
  });

  it('handles empty string content', () => {
    const etag = generateETag('');
    expect(etag).toMatch(/^W\/"[a-f0-9]{16}"$/);
  });

  it('weak and strong ETags differ for the same content', () => {
    const weak = generateETag('same content', true);
    const strong = generateETag('same content', false);
    expect(weak).not.toBe(strong);
    expect(weak.startsWith('W/')).toBe(true);
    expect(strong.startsWith('W/')).toBe(false);
  });
});

describe('isETagMatch', () => {
  const makeReq = (ifNoneMatch?: string): Partial<Request> => ({
    headers: ifNoneMatch ? { 'if-none-match': ifNoneMatch } : {},
  });

  it('returns false when If-None-Match header is absent', () => {
    const req = makeReq();
    expect(isETagMatch(req as Request, 'W/"abc123"')).toBe(false);
  });

  it('returns true when ETag matches exactly', () => {
    const etag = 'W/"abc123"';
    const req = makeReq(etag);
    expect(isETagMatch(req as Request, etag)).toBe(true);
  });

  it('returns true for wildcard *', () => {
    const req = makeReq('*');
    expect(isETagMatch(req as Request, 'W/"anything"')).toBe(true);
  });

  it('returns true when ETag is one of multiple candidates', () => {
    const req = makeReq('W/"aaa", W/"bbb", W/"ccc"');
    expect(isETagMatch(req as Request, 'W/"bbb"')).toBe(true);
  });

  it('returns false when ETag does not match any candidate', () => {
    const req = makeReq('W/"aaa", W/"bbb"');
    expect(isETagMatch(req as Request, 'W/"ccc"')).toBe(false);
  });
});
