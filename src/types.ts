import { Request, Response } from 'express';

export interface CacheRule {
  path: string | RegExp;
  methods?: string[];
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  private?: boolean;
  public?: boolean;
  immutable?: boolean;
}

export interface RouteCacheOptions {
  rules: CacheRule[];
  defaultMaxAge?: number;
}

export interface VaryRule {
  path: string | RegExp;
  headers: string[];
  methods?: string[];
}

export interface VaryOptions {
  rules: VaryRule[];
}

export interface ETagOptions {
  weak?: boolean;
  customGenerator?: (req: Request, res: Response, body: string) => string;
}

export interface StaleRule {
  path: string | RegExp;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  methods?: string[];
}

export interface StaleOptions {
  rules: StaleRule[];
}

export interface NoCachePattern {
  path: string | RegExp;
  methods?: string[];
}

export interface NoCacheOptions {
  patterns: NoCachePattern[];
}

export interface StatusCacheRule {
  statusCode: number | number[];
  maxAge: number;
  sMaxAge?: number;
}

export interface StatusCacheOptions {
  rules: StatusCacheRule[];
  defaultMaxAge?: number;
}

export interface SurrogateRule {
  path: string | RegExp;
  methods?: string[];
  maxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  noStore?: boolean;
}

export interface SurrogateCacheOptions {
  rules: SurrogateRule[];
  stripOnResponse?: boolean;
}
