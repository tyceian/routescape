import express from 'express';
import { cacheSegmentation } from '../src/cacheSegmentation';
import { cacheControl } from '../src/cacheControl';

const app = express();

// Segment cache by locale cookie and region query param for product pages,
// and by user role header for dashboard routes.
app.use(
  cacheSegmentation({
    rules: [
      {
        route: '/api/products*',
        segmentBy: ['cookie', 'query'],
        cookieKeys: ['locale'],
        queryKeys: ['region'],
      },
      {
        route: '/api/dashboard*',
        segmentBy: ['header'],
        headerKeys: ['x-user-role'],
      },
      {
        route: '/api/search',
        segmentBy: ['method', 'query'],
        queryKeys: ['q', 'page'],
      },
    ],
    headerName: 'X-Cache-Segment',
  })
);

app.use(
  cacheControl({
    rules: [
      { path: '/api/products*', maxAge: 300, sMaxAge: 600 },
      { path: '/api/dashboard*', maxAge: 0, private: true },
      { path: '/api/search', maxAge: 60, sMaxAge: 120 },
    ],
  })
);

app.get('/api/products', (req, res) => {
  res.json({
    products: [{ id: 1, name: 'Widget' }],
    segment: res.getHeader('X-Cache-Segment'),
  });
});

app.get('/api/dashboard', (req, res) => {
  res.json({
    data: { stats: 42 },
    segment: res.getHeader('X-Cache-Segment'),
  });
});

app.get('/api/search', (req, res) => {
  res.json({
    results: [],
    query: req.query.q,
    segment: res.getHeader('X-Cache-Segment'),
  });
});

app.listen(3000, () => {
  console.log('Cache segmentation example running on http://localhost:3000');
});
