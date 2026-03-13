import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    base44({
      // Base44 Publish sets this to route @/entities, @/functions, @/integrations through SDK.
      // Locally, real files in src/entities/ etc. are used instead (SDK pass-throughs).
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true'
    }),
    react(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_ENV__: JSON.stringify(process.env.BUILD_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development')),
  },
  build: {
    chunkSizeWarningLimit: 500,
    // Source maps for dev deploys only (production via Base44 Publish has 5MB limit)
    sourcemap: process.env.BUILD_ENV === 'dev',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    rollupOptions: {
      // web-vitals is loaded via dynamic import at runtime; mark external so Rollup
      // doesn't fail when the package isn't installed (Base44 Publish environment).
      external: ['web-vitals'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
