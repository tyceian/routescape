import express from 'express';
import { requestCoalescing } from '../src/requestCoalescing';

const app = express();

/**
 * Request coalescing example
 *
 * When multiple identical in-flight GET requests arrive before the first
 * one has been answered, only the first request hits the handler. The
 * remaining requests are held and receive the same response once the
 * first one completes — reducing duplicate upstream work.
 */
app.use(
  requestCoalescing({
    // Treat requests with the same `locale` query param as identical
    keyFields: ['locale'],
  })
);

let handlerCallCount = 0;

app.get('/api/products', async (_req, res) => {
  handlerCallCount++;
  console.log(`Handler invoked (total: ${handlerCallCount})`);

  // Simulate a slow upstream fetch
  await new Promise((r) => setTimeout(r, 200));

  res.setHeader('Cache-Control', 'public, max-age=30');
  res.json({ products: ['widget', 'gadget'], handlerCallCount });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', handlerCallCount });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3003;
app.listen(PORT, () => {
  console.log(`Request coalescing example running on http://localhost:${PORT}`);
  console.log('Try hitting /api/products concurrently:');
  console.log(`  for i in 1 2 3 4 5; do curl -s http://localhost:${PORT}/api/products & done; wait`);
});
