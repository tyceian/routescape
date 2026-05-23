import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  matchesRoute,
  resolveTags,
  buildCacheTagHeader,
  findMatchingTagRules,
  cacheTagging,
} from './cacheTagging';

const mockReq = (path: string, extra: Partial<Request> = {}): Request =>
  ({ path, ...extra } as unknown as Request);

const mockRes = () => {
  const headers: Record<string, string> = {};
  return {
    setHeader: (key: string, value: string) => { headers[key] = value; },
    getHeaders: () => headers,
    _headers: headers,
  } as unknown as Response;
};

describe('matchesRoute', () => {
  it('matches exact string paths', () => {
    expect(matchesRoute('/api/users', '/api/users')).toBe(true);
    expect(matchesRoute('/api/posts', '/api/users')).toBe(false);
  });

  it('matches wildcard string paths', () => {
    expect(matchesRoute('/api/users/123', '/api/users/*')).toBe(true);
    expect(matchesRoute('/api/posts/1', '/api/users/*')).toBe(false);
  });

  it('matches regex patterns', () => {
    expect(matchesRoute('/api/items/42', /^\/api\/items\/\d+$/)).toBe(true);
    expect(matchesRoute('/api/items/abc', /^\/api\/items\/\d+$/)).toBe(false);
  });
});

describe('resolveTags', () => {
  it('returns static tag arrays', () => {
    const req = mockReq('/test');
    expect(resolveTags(req, ['tag-a', 'tag-b'])).toEqual(['tag-a', 'tag-b']);
  });

  it('calls function to resolve dynamic tags', () => {
    const req = mockReq('/users/99');
    const tagFn = (r: Request) => [`user-${r.path.split('/').pop()}`];
    expect(resolveTags(req, tagFn)).toEqual(['user-99']);
  });
});

describe('buildCacheTagHeader', () => {
  it('joins tags with spaces', () => {
    expect(buildCacheTagHeader(['tag-a', 'tag-b'])).toBe('tag-a tag-b');
  });

  it('deduplicates tags', () => {
    expect(buildCacheTagHeader(['tag-a', 'tag-a', 'tag-b'])).toBe('tag-a tag-b');
  });
});

describe('findMatchingTagRules', () => {
  it('returns all matching rules', () => {
    const rules = [
      { match: '/api/*', tags: ['api'] },
      { match: '/api/users/*', tags: ['users'] },
      { match: '/other', tags: ['other'] },
    ];
    const matches = findMatchingTagRules(mockReq('/api/users/1'), rules);
    expect(matches).toHaveLength(2);
  });
});

describe('cacheTagging middleware', () => {
  it('sets Cache-Tag header for matching routes', () => {
    const middleware = cacheTagging({
      rules: [{ match: '/products/*', tags: ['products', 'catalog'] }],
    });
    const req = mockReq('/products/123');
    const res = mockRes();
    const next = vi.fn();
    middleware(req, res, next);
    expect((res as any)._headers['Cache-Tag']).toBe('products catalog');
    expect(next).toHaveBeenCalled();
  });

  it('supports custom header name', () => {
    const middleware = cacheTagging({
      rules: [{ match: '/blog/*', tags: ['blog'] }],
      headerName: 'Surrogate-Key',
    });
    const req = mockReq('/blog/post-1');
    const res = mockRes();
    const next = vi.fn();
    middleware(req, res, next);
    expect((res as any)._headers['Surrogate-Key']).toBe('blog');
  });

  it('skips header when no rules match', () => {
    const middleware = cacheTagging({
      rules: [{ match: '/api/*', tags: ['api'] }],
    });
    const req = mockReq('/static/image.png');
    const res = mockRes();
    const next = vi.fn();
    middleware(req, res, next);
    expect((res as any)._headers['Cache-Tag']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
