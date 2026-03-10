// App version and build info — injected at build time via Vite's define
export const APP_VERSION = __APP_VERSION__ ?? 'unknown';
export const BUILD_TIME = __BUILD_TIME__ ?? 'unknown';
export const BUILD_ENV = __BUILD_ENV__ ?? 'development';

// Log on startup
console.log(`[startup-kid] v${APP_VERSION} | ${BUILD_ENV} | built ${BUILD_TIME} | DEPLOY-TEST-OK`);
