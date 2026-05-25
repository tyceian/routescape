// NOTE: appending new types to existing types.ts (shown as full updated excerpt for new additions)
// Existing content preserved — only additions shown here as a patch reference.

// ─── Cache Revalidation ───────────────────────────────────────────────────────

export interface RevalidationRule {
  /** Route path or pattern to match */
  path: string | RegExp;
  /** max-age in seconds */
  maxAge?: number;
  /** stale-while-revalidate in seconds */
  staleWhileRevalidate?: number;
  /** stale-if-error in seconds */
  staleIfError?: number;
  /** add must-revalidate directive */
  mustRevalidate?: boolean;
  /** add proxy-revalidate directive */
  proxyRevalidate?: boolean;
}

export interface CacheRevalidationOptions {
  rules: RevalidationRule[];
}

// ─── (all previously defined types remain unchanged above this block) ─────────
export * from './types';
