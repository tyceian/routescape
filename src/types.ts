import { Request } from 'express';

export interface CacheControlOptions {
  maxAge?: number;
  sMaxAge?: number;
  public?: boolean;
  private?: boolean;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  proxyRevalidate?: boolean;
  immutable?: boolean;
}

export interface StaleWhileRevalidateOptions {
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export interface VaryOptions {
  headers: string[];
}

export interface ETagOptions {
  weak?: boolean;
}

export interface RouteRule {
  path: string | RegExp;
  methods?: string[];
  cacheControl?: CacheControlOptions;
  stale?: StaleWhileRevalidateOptions;
  vary?: VaryOptions;
  etag?: ETagOptions;
}

export interface RouteCacheOptions {
  rules: RouteRule[];
  defaultRule?: RouteRule;
}

export interface MatchResult {
  rule: RouteRule;
  params: Record<string, string>;
}

export type RouteMatcherFn = (req: Request) => RouteRule | null;
