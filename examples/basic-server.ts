/**
 * Basic example showing routescape used in an Express app.
 * Run with: ts-node examples/basic-server.ts
 */
import express from 'express';
import { routeCache } from '../src';

const app = express();

app.use(
  routeCache({
    rules: [
      {
        // Static assets — cache aggressively
        path: '/static/*',
        methods: ['GET'],
        directives: { maxAge: 31536000, public: true, immutable: true },
      },
      {
        // API reads — short cache with revalidation
        path: '/api/*',
        methods: ['GET'],
        directives: { maxAge: 60, mustRevalidate: true, public: true },
      },
      {
        // API writes — never cache
        path: '/api/*',
        methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
        directives: { noStore: true },
      },
    ],
    // Fallback for anything not matched above
    defaultDirectives: { noCache: true },
  })
);

app.get('/static/logo.png', (_req, res) => {
  res.json({ file: 'logo.png' });
});

app.get('/api/users', (_req, res) => {
  res.json([{ id: 1, name: 'Alice' }]);
});

app.post('/api/users', (_req, res) => {
  res.status(201).json({ id: 2, name: 'Bob' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Example server running on http://localhost:${PORT}`);
});
