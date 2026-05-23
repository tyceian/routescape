import { describe, it, expect, vi } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import {
  isPurgeRequest,
  matchesPurgePath,
  isValidPurgeToken,
  buildPurgeResponseHeaders,
  cachePurge,
} from './cachePurge';

describe('isPurgeRequest', () => {
  it('returns true for PURGE method', () => {
    const req = createRequest({ method: 'PURGE' });
    expect(isPurgeRequest(req)).toBe(true);
  });

  it('returns false for GET method', () => {
    const req = createRequest({ method: 'GET' });
    expect(isPurgeRequest(req)).toBe(false);
  });

  it('supports custom purge method', () => {
    const req = createRequest({ method: 'BAN' });
    expect(isPurgeRequest(req, 'BAN')).toBe(true);
  });
});

describe('matchesPurgePath', () => {
  it('matches exact path', () => {
    expect(matchesPurgePath('/api/users', '/api/users')).toBe(true);
  });

  it('does not match different path', () => {
    expect(matchesPurgePath('/api/users', '/api/posts')).toBe(false);
  });

  it('matches wildcard prefix', () => {
    expect(matchesPurgePath('/api/*', '/api/users')).toBe(true);
    expect(matchesPurgePath('/api/*', '/api/posts/123')).toBe(true);
  });

  it('matches global wildcard', () => {
    expect(matchesPurgePath('*', '/anything')).toBe(true);
  });
});

describe('isValidPurgeToken', () => {
  it('returns true when token matches secret', () => {
    const req = createRequest({ headers: { 'x-purge-token': 'mysecret' } });
    expect(isValidPurgeToken(req, 'mysecret')).toBe(true);
  });

  it('returns false when token does not match', () => {
    const req = createRequest({ headers: { 'x-purge-token': 'wrong' } });
    expect(isValidPurgeToken(req, 'mysecret')).toBe(false);
  });

  it('returns false when token is missing', () => {
    const req = createRequest({});
    expect(isValidPurgeToken(req, 'mysecret')).toBe(false);
  });
});

describe('buildPurgeResponseHeaders', () => {
  it('builds headers with purged paths', () => {
    const headers = buildPurgeResponseHeaders(['/api/users', '/api/posts']);
    expect(headers['X-Purged-Paths']).toBe('/api/users, /api/posts');
    expect(headers['X-Purge-Status']).toBe('ok');
  });
});

describe('cachePurge middleware', () => {
  it('calls next for non-purge requests', () => {
    const middleware = cachePurge({ rules: [] });
    const req = createRequest({ method: 'GET', path: '/api/users' });
    const res = createResponse();
    const next = vi.fn();
    middleware(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 if token is invalid', () => {
    const middleware = cachePurge({ secret: 'topsecret', rules: [] });
    const req = createRequest({ method: 'PURGE', path: '/api/users', headers: { 'x-purge-token': 'wrong' } });
    const res = createResponse();
    const next = vi.fn();
    middleware(req as any, res as any, next);
    expect(res.statusCode).toBe(403);
  });

  it('purges matched routes and calls onPurge', () => {
    const onPurge = vi.fn();
    const middleware = cachePurge({
      secret: 'topsecret',
      rules: [{ path: '/api/users' }, { path: '/api/posts' }],
      onPurge,
    });
    const req = createRequest({
      method: 'PURGE',
      path: '/api/users',
      headers: { 'x-purge-token': 'topsecret' },
    });
    const res = createResponse();
    const next = vi.fn();
    middleware(req as any, res as any, next);
    expect(res.statusCode).toBe(200);
    expect(onPurge).toHaveBeenCalledWith([{ path: '/api/users' }], expect.anything());
  });
});
