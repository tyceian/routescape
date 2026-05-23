import { cacheMetrics, getMetrics, resetMetrics, recordHit, recordMiss, recordBypass } from './cacheMetrics';
import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

function mockRes(overrides: Partial<Record<string, any>> = {}): Response {
  const emitter = new EventEmitter();
  const headers: Record<string, any> = {};
  return {
    getHeader: (name: string) => headers[name.toLowerCase()],
    setHeader: (name: string, val: any) => { headers[name.toLowerCase()] = val; },
    on: emitter.on.bind(emitter),
    removeListener: emitter.removeListener.bind(emitter),
    emit: emitter.emit.bind(emitter),
    ...overrides,
  } as unknown as Response;
}

const mockNext: NextFunction = () => {};

beforeEach(() => resetMetrics());

describe('getMetrics', () => {
  it('returns zero values on fresh state', () => {
    const m = getMetrics();
    expect(m.hits).toBe(0);
    expect(m.misses).toBe(0);
    expect(m.bypasses).toBe(0);
    expect(m.totalRequests).toBe(0);
    expect(m.hitRate).toBe(0);
  });

  it('calculates hitRate correctly', () => {
    recordHit();
    recordHit();
    recordMiss();
    const m = getMetrics();
    expect(m.hitRate).toBeCloseTo(0.6667, 3);
  });
});

describe('cacheMetrics middleware', () => {
  it('records a bypass when Cache-Control is no-store', () => {
    const res = mockRes();
    res.setHeader('Cache-Control', 'no-store');
    cacheMetrics()({} as Request, res, mockNext);
    (res as any).emit('finish');
    expect(getMetrics().bypasses).toBe(1);
  });

  it('records a hit when Age header is positive', () => {
    const res = mockRes();
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Age', '120');
    cacheMetrics()({} as Request, res, mockNext);
    (res as any).emit('finish');
    expect(getMetrics().hits).toBe(1);
  });

  it('records a miss when Cache-Control set but Age is absent', () => {
    const res = mockRes();
    res.setHeader('Cache-Control', 'public, max-age=3600');
    cacheMetrics()({} as Request, res, mockNext);
    (res as any).emit('finish');
    expect(getMetrics().misses).toBe(1);
  });

  it('calls next', () => {
    const next = jest.fn();
    const res = mockRes();
    cacheMetrics()({} as Request, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('records bypass when no Cache-Control header present', () => {
    const res = mockRes();
    cacheMetrics()({} as Request, res, mockNext);
    (res as any).emit('finish');
    expect(getMetrics().bypasses).toBe(1);
  });
});

describe('resetMetrics', () => {
  it('clears all counters', () => {
    recordHit();
    recordMiss();
    recordBypass();
    resetMetrics();
    const m = getMetrics();
    expect(m.totalRequests).toBe(0);
  });
});
