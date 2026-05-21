import express from 'express';
import { surrogateCacheControl } from '../src';

const app = express();

/**
 * Example: Using surrogateCacheControl to set CDN-facing cache headers.
 * Surrogate-Control is respected by CDNs (Fastly, Varnish, etc.) and
 * typically stripped before reaching the browser.
 */
app.use(
  surrogateCacheControl({
    rules: [
      {
        path: /^\/api\/products/,
        maxAge: 3600,
        staleWhileRevalidate: 300,
        staleIfError: 86400,
      },
      {
        path: '/api/config',
        maxAge: 600,
      },
      {
        path: '/api/user/profile',
        noStore: true,
      },
      {
        path: /^\/static\//,
        maxAge: 86400,
        staleIfError: 604800,
      },
    ],
    // stripOnResponse: true — uncomment to remove header before sending to client
  })
);

app.get('/api/products', (_req, res) => {
  res.json([{ id: 1, name: 'Widget' }, { id: 2, name: 'Gadget' }]);
});

app.get('/api/products/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Widget', price: 9.99 });
});

app.get('/api/config', (_req, res) => {
  res.json({ featureFlags: { newUI: true }, version: '1.2.3' });
});

app.get('/api/user/profile', (_req, res) => {
  res.json({ id: 42, name: 'Alice', email: 'alice@example.com' });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Surrogate cache control example running on http://localhost:${PORT}`);
  console.log('Try: curl -I http://localhost:3003/api/products');
});
