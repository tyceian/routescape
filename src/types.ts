import { Request } from 'express';

export interface CacheRule {
  path: string | RegExp;
  maxAge?: number;
  sMaxAge?: number;
  private?: boolean;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export interface RouteCacheOptions {
  rules: CacheRule[];
  defaultMaxAge?: number;
}

export interface VaryHeaderOptions {
  fields: string[];
  merge?: boolean;
}

export interface ETagOptions {
  weak?: boolean;
  customGenerator?: (body: string) => string;
}

export interface StaleDirectives {
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export interface NoCachePattern {
  path: string | RegExp;
  methods?: string[];
}

export interface NoCacheRoutesOptions {
  patterns: NoCachePattern[];
  header?: string;
}

export interface ConditionalGetOptions {
  trustXForwardedFor?: boolean;
}

export interface StatusCacheRule {
  status: number | number[] | '2xx' | '3xx' | '4xx' | '5xx';
  maxAge?: number;
  sMaxAge?: number;
  private?: boolean;
  noCache?: boolean;
}

export interface CacheByStatusOptions {
  rules: StatusCacheRule[];
  overrideExisting?: boolean;
}

export type CacheKeyGenerator = (req: Request) => string;
