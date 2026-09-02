import { test, expect } from '../src/fixtures/lxpTest.js';
import { A11yAuditor } from '@open-test/playwright-core';

test.describe('Enterprise WCAG 2.1 AA & Section 508 Accessibility Suite @accessibility @a11y', () => {
  test('[TC-A11Y-001] Learner Home has no critical axe violations', async ({
    loginAs,
    page,
  }) => {
    await loginAs('learner', '/#/learner/home');
    await page.waitForLoadState('domcontentloaded');

    const result = await A11yAuditor.auditPage(page);
    expect(result.hasCriticalViolations).toBe(false);
  });
});
