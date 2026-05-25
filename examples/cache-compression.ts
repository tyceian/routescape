import express from 'express';
import { cacheCompression } from '../src/cacheCompression';
import { cacheControl } from '../src/cacheControl';

const app = express();

// Apply cache compression middleware globally — annotates responses
// with the selected content encoding and sets Vary: Accept-Encoding
// so caches store separate entries per encoding.
app.use(
  cacheCompression({
    encodings: ['br', 'gzip', 'deflate'],
    minSize: 512,
    varyOnEncoding: true,
  })
);

app.use(
  cacheControl({
    rules: [
      { path: '/api/', maxAge: 60, sMaxAge: 300 },
      { path: '/static/', maxAge: 86400, immutable: true },
    ],
  })
);

app.get('/api/products', (_req, res) => {
  res.json({
    products: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Product ${i + 1}`,
      price: ((i + 1) * 9.99).toFixed(2),
    })),
  });
});

app.get('/api/summary', (_req, res) => {
  // Small response — compression headers won't be applied
  res.json({ total: 42 });
});

app.get('/static/config', (_req, res) => {
  res.json({ theme: 'dark', locale: 'en-US' });
});

app.listen(3000, () => {
  console.log('cache-compression example running on http://localhost:3000');
  console.log('Try: curl -H "Accept-Encoding: br, gzip" http://localhost:3000/api/products');
});
