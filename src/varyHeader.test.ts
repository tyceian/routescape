import { buildVaryHeader, mergeVaryHeaders, varyHeader } from './varyHeader';
import { Request, Response, NextFunction } from 'express';

describe('buildVaryHeader', () => {
  it('joins headers into a comma-separated string', () => {
    expect(buildVaryHeader(['Accept', 'Accept-Encoding'])).toBe('Accept, Accept-Encoding');
  });

  it('returns empty string for empty array', () => {
    expect(buildVaryHeader([])).toBe('');
  });

  it('handles a single header', () => {
    expect(buildVaryHeader(['Authorization'])).toBe('Authorization');
  });

  it('trims whitespace from header names', () => {
    expect(buildVaryHeader(['  Accept  ', 'Origin'])).toBe('Accept, Origin');
  });
});

describe('mergeVaryHeaders', () => {
  it('appends new headers to existing', () => {
    const result = mergeVaryHeaders('Accept', ['Origin']);
    expect(result).toBe('Accept, Origin');
  });

  it('does not duplicate existing headers (case-insensitive)', () => {
    const result = mergeVaryHeaders('Accept', ['accept', 'Origin']);
    expect(result).toBe('Accept, Origin');
  });

  it('handles empty existing value', () => {
    const result = mergeVaryHeaders('', ['Accept', 'Origin']);
    expect(result).toBe('Accept, Origin');
  });
});

describe('varyHeader middleware', () => {
  const mockNext: NextFunction = jest.fn();

  const makeRes = () => {
    const headers: Record<string, string> = {};
    return {
      getHeader: (name: string) => headers[name],
      setHeader: (name: string, value: string) => { headers[name] = value; },
      _headers: headers,
    } as unknown as Response;
  };

  it('sets Vary header from options', () => {
    const res = makeRes();
    const middleware = varyHeader({ headers: ['Accept', 'Origin'] });
    middleware({} as Request, res, mockNext);
    expect(res.getHeader('Vary')).toBe('Accept, Origin');
    expect(mockNext).toHaveBeenCalled();
  });

  it('merges with existing Vary header', () => {
    const res = makeRes();
    res.setHeader('Vary', 'Accept-Encoding');
    const middleware = varyHeader({ headers: ['Accept'] });
    middleware({} as Request, res, mockNext);
    expect(res.getHeader('Vary')).toBe('Accept-Encoding, Accept');
  });

  it('calls next without setting header when no headers provided', () => {
    const res = makeRes();
    const middleware = varyHeader({ headers: [] });
    middleware({} as Request, res, mockNext);
    expect(res.getHeader('Vary')).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });
});
