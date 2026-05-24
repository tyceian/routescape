import { Request, Response, NextFunction } from 'express';

export type CacheMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

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

export interface RouteRule {
  path: string | RegExp;
  methods?: string[];
  cache: CacheControlOptions;
}

export interface RouteCacheOptions {
  rules: RouteRule[];
  defaultCache?: CacheControlOptions;
  vary?: string[];
}

export interface VaryOptions {
  fields: string[];
  merge?: boolean;
}

export interface ETagOptions {
  weak?: boolean;
  customGenerator?: (body: string) => string;
}

export interface StaleOptions {
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export interface NoCacheOptions {
  patterns: Array<string | RegExp>;
  header?: string;
}

export interface ConditionalGetOptions {
  trustXForwardedFor?: boolean;
}

export interface StatusCacheRule {
  status: number | number[];
  cache: CacheControlOptions;
}

export interface CacheByStatusOptions {
  rules: StatusCacheRule[];
  fallthrough?: boolean;
}

export interface SurrogateOptions {
  maxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  noStore?: boolean;
  headerName?: string;
}

export interface CacheKeyOptions {
  includeQuery?: boolean | string[];
  includeHeaders?: string[];
  prefix?: string;
  transform?: (req: Request) => string;
}

export interface CoalescingOptions {
  keyFn?: (req: Request) => string;
  timeout?: number;
}

export interface WarmingRoute {
  path: string;
  interval?: number;
  headers?: Record<string, string>;
}

export interface CacheWarmingOptions {
  routes: WarmingRoute[];
  baseUrl?: string;
}

export interface TagRule {
  path: string | RegExp;
  tags: string[] | ((req: Request) => string[]);
}

export interface CacheTaggingOptions {
  rules: TagRule[];
  headerName?: string;
}

export interface InvalidationRule {
  trigger: string | RegExp;
  invalidates: string[];
}

export interface CacheInvalidationOptions {
  rules: InvalidationRule[];
  headerName?: string;
}

export interface CachePurgeOptions {
  token: string;
  headerName?: string;
  methods?: string[];
}

export interface CacheMetricsOptions {
  enabled?: boolean;
  headerName?: string;
}

export interface CacheDebugOptions {
  enabled?: boolean;
  headerPrefix?: string;
  includeTimestamp?: boolean;
  includeRoute?: boolean;
}
