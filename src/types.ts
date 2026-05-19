/**
 * Cache directive options passed to Cache-Control header builder.
 * Mirrors the options accepted by buildCacheControlHeader.
 */
export interface CacheDirectives {
  maxAge?: number;
  sMaxAge?: number;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  proxyRevalidate?: boolean;
  public?: boolean;
  private?: boolean;
  immutable?: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

/**
 * A single declarative cache rule mapping a route pattern to cache directives.
 */
export interface CacheRule {
  /** Route path or pattern. Use trailing `*` for prefix matching. */
  path: string;
  /** HTTP methods this rule applies to. Defaults to all methods if omitted. */
  methods?: string[];
  /** Cache-Control directives to apply when this rule matches. */
  directives: CacheDirectives;
}

/**
 * Options accepted by the routeCache middleware factory.
 */
export interface RouteCacheOptions {
  /** Ordered list of cache rules. First match wins. */
  rules: CacheRule[];
  /** Fallback directives applied when no rule matches. */
  defaultDirectives?: CacheDirectives;
}
