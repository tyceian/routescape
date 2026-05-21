import express from 'express';
import { cacheByStatus } from '../src/cacheByStatus';

const app = express();

/**
 * Example: apply different Cache-Control headers based on HTTP response status.
 *
 * - 200 responses: cache publicly for 5 minutes
 * - 301/302 redirects: cache for 1 hour
 * - 4xx errors: do not cache
 * - 5xx errors: do not cache
 */
app.use(
  cacheByStatus({
    rules: [
      { status: 200, maxAge: 300, sMaxAge: 600 },
      { status: [301, 302], maxAge: 3600 },
      { status: '4xx', noCache: true },
      { status: '5xx', noCache: true },
    ],
    overrideExisting: false,
  })
);

app.get('/ok', (_req, res) => {
  res.status(200).json({ message: 'OK — will be cached for 5 min' });
});

app.get('/redirect', (_req, res) => {
  res.redirect(301, '/ok');
});

app.get('/not-found', (_req, res) => {
  res.status(404).json({ error: 'Not found — will not be cached' });
});

app.get('/error', (_req, res) => {
  res.status(500).json({ error: 'Server error — will not be cached' });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`cache-by-status example running on http://localhost:${PORT}`);
  console.log('Try:');
  console.log(`  curl -I http://localhost:${PORT}/ok`);
  console.log(`  curl -I http://localhost:${PORT}/not-found`);
  console.log(`  curl -I http://localhost:${PORT}/error`);
});
