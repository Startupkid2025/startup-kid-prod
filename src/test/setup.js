import '@testing-library/jest-dom';

// Mock Vite's define globals
globalThis.__APP_VERSION__ = '0.0.0-test';
globalThis.__BUILD_TIME__ = '2026-01-01T00:00:00.000Z';
globalThis.__BUILD_ENV__ = 'test';

// Mock import.meta.env
globalThis.import = { meta: { env: {} } };
