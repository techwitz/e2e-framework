import { test, expect } from '../src/fixtures/lxpTest.js';
import { VisualMatcher } from '@open-test/playwright-core';

test.describe('Dashboard Visual Regression Suite @visual @ui', () => {
  test('[TC-VIS-001] Learner Dashboard visual baseline comparison', async ({
    loginAs,
    page,
  }) => {
    await loginAs('learner', '/#/learner/home');
    await page.waitForLoadState('domcontentloaded');

    // Assert visual snapshot with dynamic masks for timestamps and avatars
    await VisualMatcher.assertSnapshot(page, 'learner-dashboard-baseline.png', {
      maskSelectors: ['[data-testid="timestamp"]', '[data-testid="user-avatar"]'],
      maxDiffPixelRatio: 0.05,
    });
  });
});
