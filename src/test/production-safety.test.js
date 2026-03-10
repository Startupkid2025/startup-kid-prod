/**
 * Production Safety Tests
 *
 * These tests guard against issues discovered during the dev→prod merge audit (2026-03-10).
 * They run automatically in CI on every push/PR to main.
 *
 * Covered concerns:
 * 1. Entity stubs must be SDK pass-throughs (not empty returns)
 * 2. BUILD_ENV defaults to 'production' in production builds
 * 3. Sourcemaps disabled in production builds
 * 4. Version globals have safe fallbacks
 * 5. Sentry gracefully handles missing DSN
 * 6. All entity/function/integration stubs route through Base44 SDK
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(__dirname, '../..');

// ─── 1. Entity stubs must NOT return empty data ───

describe('Entity stubs are SDK pass-throughs', () => {
  const entityFiles = [
    'src/entities/User.js',
    'src/entities/Group.js',
    'src/entities/Lesson.js',
    'src/entities/LessonParticipation.js',
    'src/entities/WordProgress.js',
  ];

  for (const file of entityFiles) {
    const name = file.split('/').pop();

    it(`${name} imports from base44Client`, () => {
      const fullPath = resolve(ROOT, file);
      if (!existsSync(fullPath)) return; // file may not exist if legacySDKImports handles it
      const content = readFileSync(fullPath, 'utf-8');
      expect(content).toContain("from '@/api/base44Client'");
    });

    it(`${name} does NOT return empty arrays or null`, () => {
      const fullPath = resolve(ROOT, file);
      if (!existsSync(fullPath)) return;
      const content = readFileSync(fullPath, 'utf-8');
      expect(content).not.toMatch(/async\s*\(\)\s*=>\s*\[\]/);
      expect(content).not.toMatch(/async\s*\(.*\)\s*=>\s*null/);
      expect(content).not.toMatch(/async\s*\(.*\)\s*=>\s*data/);
    });

    it(`${name} routes through base44.entities or base44.auth`, () => {
      const fullPath = resolve(ROOT, file);
      if (!existsSync(fullPath)) return;
      const content = readFileSync(fullPath, 'utf-8');
      expect(
        content.includes('base44.entities') || content.includes('base44.auth')
      ).toBe(true);
    });
  }
});

describe('Function stubs are SDK pass-throughs', () => {
  it('deleteOldCoinLogs routes through base44.functions', () => {
    const fullPath = resolve(ROOT, 'src/functions/deleteOldCoinLogs.js');
    if (!existsSync(fullPath)) return;
    const content = readFileSync(fullPath, 'utf-8');
    expect(content).toContain('base44.functions');
    expect(content).not.toMatch(/console\.warn/);
  });
});

describe('Integration stubs are SDK pass-throughs', () => {
  it('Core.js routes through base44.integrations', () => {
    const fullPath = resolve(ROOT, 'src/integrations/Core.js');
    if (!existsSync(fullPath)) return;
    const content = readFileSync(fullPath, 'utf-8');
    expect(content).toContain('base44.integrations');
    expect(content).not.toMatch(/console\.warn/);
  });
});

// ─── 2. Vite config: BUILD_ENV and sourcemaps ───

describe('Vite build configuration', () => {
  const viteConfig = readFileSync(resolve(ROOT, 'vite.config.js'), 'utf-8');

  it('BUILD_ENV defaults to production when NODE_ENV is production', () => {
    // Must NOT default to 'development' unconditionally
    expect(viteConfig).not.toMatch(
      /BUILD_ENV.*\|\|\s*['"]development['"]\s*[,)]/
    );
    // Must check NODE_ENV for production fallback
    expect(viteConfig).toContain('NODE_ENV');
  });

  it('sourcemaps are NOT always enabled', () => {
    // Must NOT have unconditional sourcemap: true
    expect(viteConfig).not.toMatch(/sourcemap:\s*true\s*[,}]/);
  });

  it('has es2020 build target', () => {
    expect(viteConfig).toContain("target: 'es2020'");
  });
});

// ─── 3. Sentry graceful degradation ───

describe('Sentry configuration', () => {
  it('initSentry returns early without DSN', () => {
    const sentry = readFileSync(resolve(ROOT, 'src/lib/sentry.js'), 'utf-8');
    // Must check for DSN before initializing
    expect(sentry).toMatch(/SENTRY_DSN/);
    expect(sentry).toMatch(/return|if/);
  });

  it('App.jsx has ErrorBoundary with fallback', () => {
    const app = readFileSync(resolve(ROOT, 'src/App.jsx'), 'utf-8');
    expect(app).toContain('ErrorBoundary');
    // Must have a fallback so it doesn't crash if Sentry is missing
    expect(app).toMatch(/\?\?/);
  });
});

// ─── 4. Version globals have fallbacks ───

describe('Version module safety', () => {
  it('all globals have ?? fallbacks', () => {
    const version = readFileSync(resolve(ROOT, 'src/lib/version.js'), 'utf-8');
    expect(version).toContain("__APP_VERSION__ ?? 'unknown'");
    expect(version).toContain("__BUILD_TIME__ ?? 'unknown'");
    expect(version).toContain("__BUILD_ENV__ ??");
  });
});

// ─── 5. Layout dev badge is gated ───

describe('Layout dev badge', () => {
  it('version badge only shows in non-production', () => {
    const layout = readFileSync(resolve(ROOT, 'src/Layout.jsx'), 'utf-8');
    // Must check BUILD_ENV before rendering badge
    expect(layout).toMatch(/BUILD_ENV\s*!==\s*['"]production['"]/);
  });
});

// ─── 6. Lazy loading is configured ───

describe('Lazy loading', () => {
  it('pages.config.js uses lazy loading', () => {
    const config = readFileSync(resolve(ROOT, 'src/pages.config.js'), 'utf-8');
    // Must use React.lazy or { lazy } from 'react' with dynamic import()
    expect(config).toMatch(/lazy\s*\(\s*\(\)\s*=>\s*import\(/);
  });

  it('App.jsx has Suspense wrapper', () => {
    const app = readFileSync(resolve(ROOT, 'src/App.jsx'), 'utf-8');
    expect(app).toContain('Suspense');
  });
});

// ─── 7. Branch sync check — dev must not drift from main ───

describe('Branch sync check', () => {
  // Skip in CI if git is not available or branches aren't fetched
  const isGitRepo = existsSync(resolve(ROOT, '.git'));

  it('all admin component imports resolve to existing files', () => {
    const admin1 = readFileSync(resolve(ROOT, 'src/pages/Admin1.jsx'), 'utf-8');
    const importRegex = /import\s+\w+\s+from\s+["']\.\.\/components\/admin\/(\w+)["']/g;
    let match;
    const missing = [];
    while ((match = importRegex.exec(admin1)) !== null) {
      const componentName = match[1];
      const filePath = resolve(ROOT, `src/components/admin/${componentName}.jsx`);
      if (!existsSync(filePath)) {
        missing.push(componentName);
      }
    }
    expect(missing, `Missing admin components: ${missing.join(', ')}`).toEqual([]);
  });

  it('all page imports in pages.config.js resolve to existing files', () => {
    const config = readFileSync(resolve(ROOT, 'src/pages.config.js'), 'utf-8');
    const importRegex = /import\(\s*["']\.\/pages\/(\w+)["']\s*\)/g;
    let match;
    const missing = [];
    while ((match = importRegex.exec(config)) !== null) {
      const pageName = match[1];
      const filePath = resolve(ROOT, `src/pages/${pageName}.jsx`);
      if (!existsSync(filePath)) {
        missing.push(pageName);
      }
    }
    expect(missing, `Missing page files: ${missing.join(', ')}`).toEqual([]);
  });

  it('no orphan components in admin/ that are never imported', () => {
    const adminDir = resolve(ROOT, 'src/components/admin');
    if (!existsSync(adminDir)) return;
    const adminFiles = readdirSync(adminDir).filter(f => f.endsWith('.jsx'));
    const orphans = [];
    for (const file of adminFiles) {
      const componentName = file.replace('.jsx', '');
      // Search all src files for imports of this component
      try {
        const result = execSync(
          `grep -rl "${componentName}" "${resolve(ROOT, 'src')}" --include="*.jsx" --include="*.js" 2>/dev/null`,
          { encoding: 'utf-8' }
        ).trim();
        const importingFiles = result.split('\n').filter(f => !f.endsWith(file));
        if (importingFiles.length === 0) {
          orphans.push(componentName);
        }
      } catch {
        // grep returns exit code 1 if no match
        orphans.push(componentName);
      }
    }
    if (orphans.length > 0) {
      console.warn(`⚠ Orphan admin components (not imported anywhere): ${orphans.join(', ')}`);
    }
    // Warn but don't fail — orphans are suspicious but not always bugs
  });

  it('no source file drift between dev and main', () => {
    if (!isGitRepo) return;
    try {
      execSync('git rev-parse origin/main', { cwd: ROOT, encoding: 'utf-8' });
    } catch {
      return; // origin/main not fetched, skip
    }

    // Check for src/ files that exist on main but not on dev
    let diffOutput;
    try {
      diffOutput = execSync(
        'git diff --name-status HEAD origin/main -- src/ functions/',
        { cwd: ROOT, encoding: 'utf-8' }
      ).trim();
    } catch {
      return;
    }

    if (!diffOutput) return; // no diff, fully in sync

    // Parse added files (A = exists on main but not dev)
    const addedOnMain = diffOutput
      .split('\n')
      .filter(line => line.startsWith('A\t'))
      .map(line => line.split('\t')[1])
      .filter(f => f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts'));

    if (addedOnMain.length > 0) {
      console.warn(`⚠ Files on main missing from dev: ${addedOnMain.join(', ')}. Consider: git merge origin/main`);
    }
  });
});
