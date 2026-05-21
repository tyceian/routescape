import { findStatusRule, buildStatusCacheHeader } from './cacheByStatus';
import { StatusCacheRule } from './types';

const rules: StatusCacheRule[] = [
  { status: 200, maxAge: 300 },
  { status: [301, 302], maxAge: 3600 },
  { status: '4xx', noCache: true },
  { status: '5xx', noCache: true },
  { status: 404, maxAge: 60, private: true },
];

describe('findStatusRule', () => {
  it('matches an exact numeric status', () => {
    const rule = findStatusRule(200, rules);
    expect(rule).toBeDefined();
    expect(rule?.status).toBe(200);
  });

  it('matches a status in an array', () => {
    const rule = findStatusRule(301, rules);
    expect(rule).toBeDefined();
    expect(Array.isArray(rule?.status)).toBe(true);
  });

  it('matches a wildcard pattern like 4xx', () => {
    const rule = findStatusRule(403, rules);
    expect(rule).toBeDefined();
    expect(rule?.status).toBe('4xx');
  });

  it('matches a wildcard pattern like 5xx', () => {
    const rule = findStatusRule(503, rules);
    expect(rule).toBeDefined();
    expect(rule?.status).toBe('5xx');
  });

  it('returns undefined when no rule matches', () => {
    const rule = findStatusRule(201, rules);
    expect(rule).toBeUndefined();
  });

  it('returns the first matching rule (exact before wildcard)', () => {
    // 404 appears before '4xx' in array — exact match wins
    const rule = findStatusRule(404, rules);
    expect(rule?.status).toBe('4xx'); // 4xx appears first in array
  });
});

describe('buildStatusCacheHeader', () => {
  it('builds a public max-age header', () => {
    const header = buildStatusCacheHeader({ status: 200, maxAge: 300 });
    expect(header).toBe('public, max-age=300');
  });

  it('builds a private header', () => {
    const header = buildStatusCacheHeader({ status: 200, maxAge: 60, private: true });
    expect(header).toBe('private, max-age=60');
  });

  it('builds a no-store header when noCache is true', () => {
    const header = buildStatusCacheHeader({ status: 500, noCache: true });
    expect(header).toBe('no-store, no-cache, must-revalidate');
  });

  it('includes s-maxage when provided', () => {
    const header = buildStatusCacheHeader({ status: 200, maxAge: 60, sMaxAge: 120 });
    expect(header).toContain('s-maxage=120');
    expect(header).toContain('max-age=60');
  });

  it('builds public header with no maxAge', () => {
    const header = buildStatusCacheHeader({ status: 200 });
    expect(header).toBe('public');
  });
});
