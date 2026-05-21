import { Request } from 'express';

export interface CacheRule {
  path: string | RegExp;
  methods?: string[];
  maxAge?: number;
  sMaxAge?: number;
  noStore?: boolean;
  noCache?: boolean;
  mustRevalidate?: boolean;
  public?: boolean;
  private?: boolean;
  immutable?: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  vary?: string[];
  etag?: boolean | ETagOptions;
}

export interface RouteCacheOptions {
  rules: CacheRule[];
  defaultRule?: Partial<CacheRule>;
}

export interface CacheControlOptions {
  maxAge?: number;
  sMaxAge?: number;
  noStore?: boolean;
  noCache?: boolean;
  mustRevalidate?: boolean;
  public?: boolean;
  private?: boolean;
  immutable?: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export interface ETagOptions {
  weak?: boolean;
  respectClientETag?: boolean;
}

export type RouteMatchFn = (req: Request) => boolean;
