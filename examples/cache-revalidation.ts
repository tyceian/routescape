import express from 'express';
import { cacheRevalidation } from '../src/cacheRevalidation';

const app = express();

/**
 * Example: Cache Revalidation
 *
 * Demonstrates how to configure stale-while-revalidate, stale-if-error,
 * must-revalidate, and proxy-revalidate directives per route.
 */
app.use(
  cacheRevalidation({
    rules: [
      {
        // API responses: serve stale for 30s while revalidating in background
        path: '/api/*',
        maxAge: 60,
        staleWhileRevalidate: 30,
        staleIfError: 86400,
      },
      {
        // Product pages: must revalidate once stale, allow proxy revalidation
        path: /^\/products\/\d+$/,
        maxAge: 300,
        proxyRevalidate: true,
      },
      {
        // Static data: long TTL with must-revalidate enforcement
        path: '/static-data',
        maxAge: 3600,
        mustRevalidate: true,
      },
    ],
  })
);

app.get('/api/users', (_req, res) => {
  res.json({ users: [{ id: 1, name: 'Alice' }] });
});

app.get('/products/42', (_req, res) => {
  res.json({ id: 42, name: 'Widget', price: 9.99 });
});

app.get('/static-data', (_req, res) => {
  res.json({ version: '1.0.0', features: ['a', 'b'] });
});

app.listen(3000, () => {
  console.log('Cache revalidation example running on http://localhost:3000');
});
