import { describe, it, expect } from 'vitest';
import { APP_VERSION, BUILD_ENV, BUILD_TIME } from '../lib/version';

describe('Version tracking', () => {
  it('exposes app version', () => {
    expect(APP_VERSION).toBeDefined();
    expect(APP_VERSION).not.toBe('unknown');
  });

  it('exposes build environment', () => {
    expect(BUILD_ENV).toBeDefined();
  });

  it('exposes build time', () => {
    expect(BUILD_TIME).toBeDefined();
  });
});
