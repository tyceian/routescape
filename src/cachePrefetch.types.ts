/**
 * Type definitions for the cachePrefetch middleware.
 * Re-exported from cachePrefetch.ts for consumers who want
 * to import types separately.
 */

export type { PrefetchRule, PrefetchOptions } from './cachePrefetch';

/**
 * Describes the shape of a resolved prefetch link directive
 * after building the Link header value.
 */
export interface ResolvedPrefetchLink {
  resource: string;
  rel: 'prefetch';
  as?: 'fetch' | 'document' | 'script' | 'style' | 'image';
  crossorigin?: boolean;
}

/**
 * Result of parsing an existing Link header for prefetch entries.
 */
export interface ParsedLinkHeader {
  prefetchLinks: ResolvedPrefetchLink[];
  otherDirectives: string[];
}
