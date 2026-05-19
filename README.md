# routescape

Lightweight Express middleware for declarative route-level caching rules.

## Installation

```bash
npm install routescape
```

## Usage

Define caching rules per route using a simple, declarative API:

```typescript
import express from "express";
import { routescape } from "routescape";

const app = express();

app.use(
  routescape({
    rules: [
      { path: "/api/products", ttl: 60 },
      { path: "/api/user", ttl: 0, private: true },
      { path: "/static/*", ttl: 3600 },
    ],
  })
);

app.get("/api/products", (req, res) => {
  res.json({ products: [] });
  // Response will include: Cache-Control: public, max-age=60
});

app.listen(3000);
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `path` | `string` | Route pattern to match |
| `ttl` | `number` | Cache duration in seconds |
| `private` | `boolean` | Mark response as private (default: `false`) |

## License

[MIT](./LICENSE)