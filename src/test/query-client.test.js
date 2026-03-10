import { describe, it, expect } from 'vitest';
import { queryClientInstance } from '../lib/query-client';

describe('React Query configuration', () => {
  it('has staleTime configured', () => {
    const defaults = queryClientInstance.getDefaultOptions();
    expect(defaults.queries.staleTime).toBeGreaterThan(0);
  });

  it('has gcTime configured', () => {
    const defaults = queryClientInstance.getDefaultOptions();
    expect(defaults.queries.gcTime).toBeGreaterThan(0);
  });

  it('does not refetch on window focus', () => {
    const defaults = queryClientInstance.getDefaultOptions();
    expect(defaults.queries.refetchOnWindowFocus).toBe(false);
  });

  it('retries once', () => {
    const defaults = queryClientInstance.getDefaultOptions();
    expect(defaults.queries.retry).toBe(1);
  });
});
