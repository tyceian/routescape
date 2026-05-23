import { Request, Response } from 'express';

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
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export interface RouteRule {
  path: string | RegExp;
  methods?: string[];
  cache: CacheControlOptions;
  vary?: string[];
}

export interface RouteCacheOptions {
  rules: RouteRule[];
  defaultCache?: CacheControlOptions;
}

export interface VaryOptions {
  fields: string[];
  append?: boolean;
}

export interface ETagOptions {
  weak?: boolean;
  onHit?: (req: Request, res: Response) => void;
}

export interface StaleDirectives {
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export interface NoCacheOptions {
  patterns: Array<string | RegExp>;
  header?: string;
}

export interface ConditionalGetOptions {
  onNotModified?: (req: Request, res: Response) => void;
}

export interface StatusCacheRule {
  status: number | number[];
  cache: CacheControlOptions;
}

export interface CacheByStatusOptions {
  rules: StatusCacheRule[];
  passthrough?: boolean;
}

export interface SurrogateOptions {
  maxAge?: number;
  sMaxAge?: number;
  tags?: string[];
  noStore?: boolean;
  noCache?: boolean;
}

export interface CacheKeyOptions {
  includeQuery?: boolean | string[];
  includeHeaders?: string[];
  transform?: (req: Request) => string;
}

export interface CoalescingOptions {
  ttl?: number;
  onCoalesce?: (key: string) => void;
}

export interface WarmingEntry {
  priority?: number;
  headers?: Record<string, string>;
}

export interface CacheWarmingOptions {
  onWarm?: (path: string, statusCode: number) => void;
  onError?: (path: string, err: Error) => void;
  markHeader?: string;
}
