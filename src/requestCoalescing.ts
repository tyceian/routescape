import { Request, Response, NextFunction } from 'express';

type PendingRequest = {
  resolve: (value: Buffer | string) => void;
  reject: (err: Error) => void;
  res: Response;
};

const pendingRequests = new Map<string, PendingRequest[]>();

export function buildCoalesceKey(req: Request, keyFields: string[] = []): string {
  const base = `${req.method}:${req.path}`;
  if (keyFields.length === 0) return base;
  const extras = keyFields
    .map((f) => `${f}=${req.query[f] ?? req.headers[f] ?? ''}`)
    .join('&');
  return `${base}?${extras}`;
}

export function isCoalescing(key: string): boolean {
  return pendingRequests.has(key);
}

export function registerPending(key: string, entry: PendingRequest): void {
  const existing = pendingRequests.get(key) ?? [];
  pendingRequests.set(key, [...existing, entry]);
}

export function resolvePending(key: string, body: Buffer | string, statusCode: number, headers: Record<string, string>): void {
  const waiters = pendingRequests.get(key) ?? [];
  pendingRequests.delete(key);
  for (const waiter of waiters) {
    Object.entries(headers).forEach(([k, v]) => waiter.res.setHeader(k, v));
    waiter.res.status(statusCode).send(body);
  }
}

export interface RequestCoalescingOptions {
  keyFields?: string[];
}

export function requestCoalescing(options: RequestCoalescingOptions = {}) {
  const { keyFields = [] } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const key = buildCoalesceKey(req, keyFields);

    if (isCoalescing(key)) {
      registerPending(key, {
        res,
        resolve: () => {},
        reject: () => {},
      });
      return;
    }

    // Mark this key as in-flight by initialising an empty waiters list
    pendingRequests.set(key, []);

    const originalSend = res.send.bind(res);

    res.send = function (body: any): Response {
      const statusCode = res.statusCode;
      const headers: Record<string, string> = {};
      const rawHeaders = res.getHeaders();
      for (const [k, v] of Object.entries(rawHeaders)) {
        if (typeof v === 'string') headers[k] = v;
      }
      resolvePending(key, body, statusCode, headers);
      return originalSend(body);
    };

    next();
  };
}
