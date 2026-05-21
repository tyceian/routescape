import { buildStaleDirectives, mergeStaleDirectives } from './staleWhileRevalidate';

describe('buildStaleDirectives', () => {
  it('returns empty string when no options provided', () => {
    expect(buildStaleDirectives({})).toBe('');
  });

  it('builds stale-while-revalidate directive', () => {
    expect(buildStaleDirectives({ staleWhileRevalidate: 60 })).toBe('stale-while-revalidate=60');
  });

  it('builds stale-if-error directive', () => {
    expect(buildStaleDirectives({ staleIfError: 300 })).toBe('stale-if-error=300');
  });

  it('builds both directives', () => {
    expect(buildStaleDirectives({ staleWhileRevalidate: 60, staleIfError: 300 })).toBe(
      'stale-while-revalidate=60, stale-if-error=300'
    );
  });

  it('handles zero values', () => {
    expect(buildStaleDirectives({ staleWhileRevalidate: 0 })).toBe('stale-while-revalidate=0');
  });
});

describe('mergeStaleDirectives', () => {
  it('returns existing when stale directives are empty', () => {
    expect(mergeStaleDirectives('max-age=3600', '')).toBe('max-age=3600');
  });

  it('returns stale directives when existing is empty', () => {
    expect(mergeStaleDirectives('', 'stale-while-revalidate=60')).toBe('stale-while-revalidate=60');
  });

  it('merges stale directives with existing Cache-Control value', () => {
    expect(mergeStaleDirectives('public, max-age=3600', 'stale-while-revalidate=60')).toBe(
      'public, max-age=3600, stale-while-revalidate=60'
    );
  });

  it('merges both stale directives with existing value', () => {
    expect(
      mergeStaleDirectives('public, max-age=3600', 'stale-while-revalidate=60, stale-if-error=300')
    ).toBe('public, max-age=3600, stale-while-revalidate=60, stale-if-error=300');
  });
});
