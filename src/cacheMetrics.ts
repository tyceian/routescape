import { Request, Response, NextFunction } from 'express';

export interface CacheMetricsSnapshot {
  hits: number;
  misses: number;
  bypasses: number;
  hitRate: number;
  totalRequests: number;
}

interface MetricsStore {
  hits: number;
  misses: number;
  bypasses: number;
}

const store: MetricsStore = {
  hits: 0,
  misses: 0,
  bypasses: 0,
};

export function recordHit(): void {
  store.hits++;
}

export function recordMiss(): void {
  store.misses++;
}

export function recordBypass(): void {
  store.bypasses++;
}

export function getMetrics(): CacheMetricsSnapshot {
  const total = store.hits + store.misses + store.bypasses;
  return {
    hits: store.hits,
    misses: store.misses,
    bypasses: store.bypasses,
    totalRequests: total,
    hitRate: total === 0 ? 0 : parseFloat((store.hits / total).toFixed(4)),
  };
}

export function resetMetrics(): void {
  store.hits = 0;
  store.misses = 0;
  store.bypasses = 0;
}

export function cacheMetrics() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const onFinish = () => {
      const cacheHeader = res.getHeader('Cache-Control') as string | undefined;
      const age = res.getHeader('Age');

      if (!cacheHeader || cacheHeader.includes('no-store') || cacheHeader.includes('no-cache')) {
        recordBypass();
      } else if (age !== undefined && Number(age) > 0) {
        recordHit();
      } else {
        recordMiss();
      }

      res.removeListener('finish', onFinish);
    };

    res.on('finish', onFinish);
    next();
  };
}
