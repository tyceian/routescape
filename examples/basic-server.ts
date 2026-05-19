import express from 'express';
import { routeCache } from '../src/routeCache';
import { varyHeader } from '../src/varyHeader';
import { cacheControl } from '../src/cacheControl';

const app = express();

// Apply a global Vary: Accept-Encoding header to all responses
app.use(varyHeader({ headers: ['Accept-Encoding'] }));

// Apply route-level caching rules with optional vary overrides
app.use(
  routeCache({
    defaultCacheControl: { noStore: true },
    defaultVary: { headers: ['Accept'] },
    rules: [
      {
        path: '/api/products',
        methods: ['GET'],
        cacheControl: { public: true, maxAge: 60, staleWhileRevalidate: 30 },
        vary: { headers: ['Accept', 'Accept-Language'] },
      },
      {
        path: '/api/products/*',
        methods: ['GET'],
        cacheControl: { public: true, maxAge: 300, immutable: false },
      },
      {
        path: '/api/user',
        cacheControl: { private: true, maxAge: 0, mustRevalidate: true },
      },
      {
        path: /^\/static\/.+/,
        cacheControl: { public: true, maxAge: 31536000, immutable: true },
      },
    ],
  })
);

app.get('/api/products', (_req, res) => {
  res.json([{ id: 1, name: 'Widget' }, { id: 2, name: 'Gadget' }]);
});

app.get('/api/products/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Widget' });
});

app.get('/api/user', (_req, res) => {
  res.json({ id: 42, name: 'Alice' });
});

app.get('/static/:file', (req, res) => {
  res.send(`Content of ${req.params.file}`);
});

app.get('/', (_req, res) => {
  res.send('routescape basic server running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
