import { describe, it, expect } from 'vitest';
import { PAGES, pagesConfig } from '../pages.config';

describe('Pages configuration', () => {
  it('has all 9 pages registered', () => {
    expect(Object.keys(PAGES)).toHaveLength(9);
  });

  it('has required pages', () => {
    const pageNames = Object.keys(PAGES);
    expect(pageNames).toContain('Home1');
    expect(pageNames).toContain('Admin1');
    expect(pageNames).toContain('Lessons1');
    expect(pageNames).toContain('Investments1');
    expect(pageNames).toContain('Leaderboard1');
    expect(pageNames).toContain('Vocabulary1');
    expect(pageNames).toContain('MathGames1');
    expect(pageNames).toContain('Profile1');
    expect(pageNames).toContain('Progress1');
  });

  it('has Home1 as the main page', () => {
    expect(pagesConfig.mainPage).toBe('Home1');
  });

  it('has a Layout component', () => {
    expect(pagesConfig.Layout).toBeDefined();
  });

  it('all pages are lazy-loaded components', () => {
    for (const [name, component] of Object.entries(PAGES)) {
      // React.lazy components have $$typeof Symbol and _init/_payload
      expect(component).toBeDefined();
      expect(component.$$typeof).toBeDefined();
    }
  });
});
