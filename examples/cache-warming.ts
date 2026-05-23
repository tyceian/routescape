import express from 'express';
import { cacheWarming, registerWarmRoute } from '../src/cacheWarming';
import { buildWarmingHeaders } from '../src/cacheWarming';
import axios from 'axios';

const app = express();

// Register routes that should be tracked when warmed
registerWarmRoute('/api/products', { priority: 1 });
registerWarmRoute('/api/categories', { priority: 2 });

// Apply cache warming middleware
app.use(
  cacheWarming({
    markHeader: 'x-cache-warmed',
    onWarm: (path, status) => {
      console.log(`[warm] ${path} -> ${status}`);
    },
    onError: (path, err) => {
      console.error(`[warm:error] ${path}`, err.message);
    },
  })
);

app.get('/api/products', (_req, res) => {
  res.json([{ id: 1, name: 'Widget' }]);
});

app.get('/api/categories', (_req, res) => {
  res.json([{ id: 1, name: 'Widgets' }]);
});

const PORT = 3007;
const server = app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Simulate warming requests on startup
  const routes = ['/api/products', '/api/categories'];
  for (const route of routes) {
    const headers = buildWarmingHeaders({ priority: 1 });
    try {
      await axios.get(`http://localhost:${PORT}${route}`, { headers });
      console.log(`Warmed: ${route}`);
    } catch (err) {
      console.error(`Failed to warm ${route}`);
    }
  }

  server.close();
});
