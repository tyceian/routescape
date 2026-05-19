export { cacheControl, buildCacheControlHeader } from './cacheControl';
export type { CacheRule } from './cacheControl';

/**
 * routescape — Lightweight Express middleware for declarative route-level caching rules.
 *
 * Usage:
 *
 *   import express from 'express';
 *   import { cacheControl } from 'routescape';
 *
 *   const app = express();
 *
 *   // Cache public assets for 1 year
 *   app.get('/static/:file', cacheControl({ public: true, maxAge: 31536000, immutable: true }), handler);
 *
 *   // Short-lived, privately cached API response
 *   app.get('/api/user', cacheControl({ private: true, maxAge: 60 }), handler);
 *
 *   // Never cache sensitive routes
 *   app.get('/api/auth', cacheControl({ noStore: true }), handler);
 */
