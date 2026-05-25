import { Request, Response, NextFunction } from 'express';

export interface CacheCompressionOptions {
  encodings?: string[];
  minSize?: number;
  varyOnEncoding?: boolean;
}

const DEFAULT_ENCODINGS = ['br', 'gzip', 'deflate'];
const DEFAULT_MIN_SIZE = 1024;

export function parseAcceptEncoding(req: Request): string[] {
  const header = req.headers['accept-encoding'] || '';
  return header
    .split(',')
    .map((e) => e.trim().split(';')[0].trim())
    .filter(Boolean);
}

export function selectEncoding(
  accepted: string[],
  supported: string[]
): string | null {
  for (const enc of supported) {
    if (accepted.includes(enc)) return enc;
  }
  return null;
}

export function buildCompressionHeaders(
  encoding: string | null,
  varyOnEncoding: boolean
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (encoding) {
    headers['X-Cache-Encoding'] = encoding;
  }
  if (varyOnEncoding) {
    headers['Vary'] = 'Accept-Encoding';
  }
  return headers;
}

export function cacheCompression(options: CacheCompressionOptions = {}) {
  const {
    encodings = DEFAULT_ENCODINGS,
    minSize = DEFAULT_MIN_SIZE,
    varyOnEncoding = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const accepted = parseAcceptEncoding(req);
    const selected = selectEncoding(accepted, encodings);

    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      const size = Buffer.byteLength(JSON.stringify(body), 'utf8');

      if (size >= minSize) {
        const headers = buildCompressionHeaders(selected, varyOnEncoding);
        Object.entries(headers).forEach(([key, value]) => {
          const existing = res.getHeader(key);
          if (key === 'Vary' && existing) {
            res.setHeader(key, `${existing}, ${value}`);
          } else {
            res.setHeader(key, value);
          }
        });
      }

      return originalJson(body);
    };

    next();
  };
}
