import { Request } from 'express';

export interface CacheControlOptions {
  maxAge?: number;
  sMaxAge?: number;
  noStore?: boolean;
  noCache?: boolean;
  mustRevalidate?: boolean;
  proxyRevalidate?: boolean;
  private?: boolean;
  public?: boolean;
  immutable?: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export interface VaryOptions {
  headers: string[];
}

export interface RouteRule {
  path: string | RegExp;
  methods?: string[];
  cacheControl?: CacheControlOptions;
  vary?: VaryOptions;
}

export interface RouteCacheOptions {
  rules: RouteRule[];
  defaultCacheControl?: CacheControlOptions;
  defaultVary?: VaryOptions;
}

export type RouteMatcher = (req: Request, rule: RouteRule) => boolean;
