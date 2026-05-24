import express from 'express';
import { cacheTtlOverride } from '../src/cacheTtlOverride';

const app = express();

/**
 * Example: Per-route TTL overrides
 *
 * Useful when you want different cache lifetimes for different
 * route groups without wiring up full cache-control middleware.
 */
app.use(
  cacheTtlOverride({
    rules: [
      // Static assets — cache for 1 day in CDN, 1 hour in browser
      {
        path: '/assets',
        ttl: 3600,
        sMaxAge: 86400,
      },
      // Product listings — short TTL, GET only
      {
        path: '/api/products',
        methods: ['GET'],
        ttl: 300,
        sMaxAge: 600,
      },
      // Regex: versioned API endpoints get a longer TTL
      {
        path: /^\/api\/v\d+\/stable/,
        ttl: 1800,
        sMaxAge: 3600,
      },
    ],
    onOverride: (req, ttl) => {
      console.log(`[TTL Override] ${req.method} ${req.path} → ttl=${ttl}s`);
    },
  })
);

app.get('/assets/logo.png', (_req, res) => {
  res.send('(binary image data)');
});

app.get('/api/products', (_req, res) => {
  res.json([{ id: 1, name: 'Widget' }, { id: 2, name: 'Gadget' }]);
});

app.get('/api/v2/stable/config', (_req, res) => {
  res.json({ featureFlags: { newUI: true } });
});

app.get('/api/users', (_req, res) => {
  // No TTL rule — no Cache-Control header added
  res.json([{ id: 1, name: 'Alice' }]);
});

app.listen(3000, () => {
  console.log('cache-ttl-override example running on http://localhost:3000');
});
