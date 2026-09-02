import { test, expect } from '../src/fixtures/lxpTest.js';
import { Given, When, Then } from '@open-test/playwright-core';

test.describe('Catalog Search Availability Gate @smoke @critical @catalog', () => {
  test('[TC-LRN-002] Search catalog returns relevant learning results', async ({
    loginAs,
    catalogPage,
    page,
  }) => {
    await Given('an authenticated user opens the learning catalog', async () => {
      await loginAs('learner', '/#/learner/catalog');
    });

    await When('the user executes a search for engineering topics', async () => {
      await catalogPage.searchCourse('React');
    });

    await Then('the React-specific course result is displayed in the grid', async () => {
      await expect(catalogPage.courseCards.first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Advanced React 19 Patterns')).toBeVisible({ timeout: 10_000 });
    });
  });
});
