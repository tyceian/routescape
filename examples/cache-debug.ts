import express from 'express';
import { cacheDebug, attachDebugInfo } from '../src/cacheDebug';
import { cacheControl } from '../src/cacheControl';

const app = express();

// Apply debug headers middleware globally
app.use(cacheDebug({
  enabled: true,
  headerPrefix: 'X-Cache-Debug',
  includeTimestamp: true,
  includeRoute: true,
}));

// Simulate a simple in-memory cache
const memCache = new Map<string, { body: string; createdAt: number }>();

app.get('/api/products', cacheControl({ maxAge: 60 }), (req, res) => {
  const key = req.path;
  const cached = memCache.get(key);

  if (cached) {
    const age = Math.floor((Date.now() - cached.createdAt) / 1000);
    attachDebugInfo(res, { hit: true, key, age, rule: 'max-age=60' });
    return res.json(JSON.parse(cached.body));
  }

  const data = { products: ['Widget A', 'Widget B', 'Widget C'] };
  memCache.set(key, { body: JSON.stringify(data), createdAt: Date.now() });

  attachDebugInfo(res, { hit: false, key, rule: 'max-age=60' });
  res.json(data);
});

app.get('/api/no-cache', (req, res) => {
  attachDebugInfo(res, { hit: false, rule: 'no-store' });
  res.json({ message: 'Always fresh' });
});

app.listen(3000, () => {
  console.log('Cache debug example running on http://localhost:3000');
  console.log('Try: curl -I http://localhost:3000/api/products');
  console.log('Response will include X-Cache-Debug-* headers');
});
