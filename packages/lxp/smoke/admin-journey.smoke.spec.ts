import { test, expect } from '../src/fixtures/lxpTest.js';
import { Given, When, Then } from '@open-test/playwright-core';

test.describe('Admin Operations Availability Gate @smoke @critical @admin', () => {
  test('[TC-ADM-001] Admin logs in and inspects user directory', async ({
    loginAs,
    adminDirectoryPage,
    page,
  }) => {
    await Given('an authenticated administrator accesses tenant administration', async () => {
      await loginAs('admin', '/#/admin/users');
    });

    await When('the user administration console renders', async () => {
      await adminDirectoryPage.assertDirectoryLoaded();
    });

    await Then('the user directory table renders real user rows and its refresh control is active', async () => {
      await expect(adminDirectoryPage.userTable).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('learner@example.test')).toBeVisible({ timeout: 10_000 });
      await expect(adminDirectoryPage.refreshButton).toBeVisible();
      await expect(adminDirectoryPage.refreshButton).toBeEnabled();
    });
  });
});
