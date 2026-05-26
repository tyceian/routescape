import express from 'express';
import { cachePrefetch } from '../src/cachePrefetch';

const app = express();

/**
 * Example: Cache Prefetch
 *
 * Adds Link: rel=prefetch headers to responses so browsers (and CDNs)
 * can proactively fetch related resources before they are requested.
 */
app.use(
  cachePrefetch({
    rules: [
      {
        route: '/',
        resources: ['/static/app.js', '/static/app.css'],
        as: 'script',
      },
      {
        route: '/dashboard',
        resources: ['/api/user/me', '/api/dashboard/summary'],
        as: 'fetch',
        crossorigin: true,
      },
      {
        route: /^\/products\/\d+$/,
        resources: ['/static/product-detail.js'],
        as: 'script',
      },
    ],
  })
);

app.get('/', (_req, res) => {
  res.json({ page: 'home' });
});

app.get('/dashboard', (_req, res) => {
  res.json({ page: 'dashboard' });
});

app.get('/products/:id', (req, res) => {
  res.json({ product: req.params.id });
});

app.listen(3000, () => {
  console.log('Cache prefetch example running on http://localhost:3000');
  console.log('Try: curl -I http://localhost:3000/');
  console.log('     curl -I http://localhost:3000/dashboard');
});
