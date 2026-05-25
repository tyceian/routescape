import { parseAcceptEncoding, selectEncoding, buildCompressionHeaders, cacheCompression } from './cacheCompression';
import { Request, Response, NextFunction } from 'express';

function mockReq(acceptEncoding?: string): Partial<Request> {
  return {
    headers: acceptEncoding ? { 'accept-encoding': acceptEncoding } : {},
  };
}

function mockRes(): Partial<Response> {
  const headers: Record<string, string> = {};
  const res: Partial<Response> = {
    setHeader: jest.fn((key: string, value: string) => { headers[key] = value; return res as Response; }),
    getHeader: jest.fn((key: string) => headers[key]),
    json: jest.fn(),
  };
  return res;
}

describe('parseAcceptEncoding', () => {
  it('parses a single encoding', () => {
    const req = mockReq('gzip');
    expect(parseAcceptEncoding(req as Request)).toEqual(['gzip']);
  });

  it('parses multiple encodings', () => {
    const req = mockReq('br, gzip, deflate');
    expect(parseAcceptEncoding(req as Request)).toEqual(['br', 'gzip', 'deflate']);
  });

  it('strips quality values', () => {
    const req = mockReq('gzip;q=0.9, br;q=1.0');
    expect(parseAcceptEncoding(req as Request)).toEqual(['gzip', 'br']);
  });

  it('returns empty array when header missing', () => {
    const req = mockReq();
    expect(parseAcceptEncoding(req as Request)).toEqual([]);
  });
});

describe('selectEncoding', () => {
  it('selects first supported encoding in priority order', () => {
    expect(selectEncoding(['gzip', 'br'], ['br', 'gzip'])).toBe('br');
  });

  it('returns null when no match', () => {
    expect(selectEncoding(['identity'], ['br', 'gzip'])).toBeNull();
  });

  it('returns null for empty accepted list', () => {
    expect(selectEncoding([], ['br'])).toBeNull();
  });
});

describe('buildCompressionHeaders', () => {
  it('includes X-Cache-Encoding when encoding provided', () => {
    const headers = buildCompressionHeaders('br', false);
    expect(headers['X-Cache-Encoding']).toBe('br');
  });

  it('includes Vary header when varyOnEncoding is true', () => {
    const headers = buildCompressionHeaders(null, true);
    expect(headers['Vary']).toBe('Accept-Encoding');
  });

  it('returns empty object when no encoding and no vary', () => {
    const headers = buildCompressionHeaders(null, false);
    expect(Object.keys(headers)).toHaveLength(0);
  });
});

describe('cacheCompression middleware', () => {
  it('calls next', () => {
    const req = mockReq('gzip');
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    cacheCompression()(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('sets encoding headers on json response for large payload', () => {
    const req = mockReq('br, gzip');
    const res = mockRes();
    const next: NextFunction = jest.fn();
    cacheCompression({ minSize: 10 })(req as Request, res as Response, next);
    (res.json as jest.Mock).mockImplementation(function(body: unknown) { return body; });
    res.json!('x'.repeat(50) as unknown as object);
    expect(res.setHeader).toHaveBeenCalledWith('X-Cache-Encoding', 'br');
  });
});
