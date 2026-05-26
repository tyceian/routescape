import { ResolvedPrefetchLink, ParsedLinkHeader } from './cachePrefetch.types';
import { PrefetchRule } from './cachePrefetch';

/**
 * Converts a PrefetchRule into an array of ResolvedPrefetchLink objects.
 */
export function resolveLinks(rule: PrefetchRule): ResolvedPrefetchLink[] {
  return rule.resources.map(resource => ({
    resource,
    rel: 'prefetch' as const,
    ...(rule.as ? { as: rule.as } : {}),
    ...(rule.crossorigin ? { crossorigin: true } : {}),
  }));
}

/**
 * Parses an existing Link header string, separating prefetch entries
 * from other directives.
 */
export function parseLinkHeader(header: string): ParsedLinkHeader {
  const parts = header.split(',').map(p => p.trim());
  const prefetchLinks: ResolvedPrefetchLink[] = [];
  const otherDirectives: string[] = [];

  for (const part of parts) {
    if (part.includes('rel=prefetch')) {
      const resourceMatch = part.match(/<([^>]+)>/);
      const asMatch = part.match(/as=(\w+)/);
      const crossorigin = part.includes('crossorigin');
      if (resourceMatch) {
        prefetchLinks.push({
          resource: resourceMatch[1],
          rel: 'prefetch',
          ...(asMatch ? { as: asMatch[1] as ResolvedPrefetchLink['as'] } : {}),
          ...(crossorigin ? { crossorigin: true } : {}),
        });
      }
    } else {
      otherDirectives.push(part);
    }
  }

  return { prefetchLinks, otherDirectives };
}

/**
 * Deduplicates resolved prefetch links by resource URL.
 */
export function deduplicatePrefetchLinks(
  links: ResolvedPrefetchLink[]
): ResolvedPrefetchLink[] {
  const seen = new Set<string>();
  return links.filter(link => {
    if (seen.has(link.resource)) return false;
    seen.add(link.resource);
    return true;
  });
}
