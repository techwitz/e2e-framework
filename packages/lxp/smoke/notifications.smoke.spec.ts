import { test, expect } from '../src/fixtures/lxpTest.js';
import { Given, When, Then } from '@open-test/playwright-core';

test.describe('Real-time Notifications Gate @smoke @critical @notifications', () => {
  test('[TC-NTF-001] Notifications center renders actionable feed items', async ({
    loginAs,
    notificationsPage,
    page,
  }) => {
    await Given('an authenticated learner navigates to notifications', async () => {
      await loginAs('learner', '/#/notifications');
    });

    await When('the notifications center loads', async () => {
      await notificationsPage.assertNotificationsLoaded();
    });

    await Then('the actionable notification item and its CTA are displayed', async () => {
      await expect(notificationsPage.notificationList).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Enrollment Approved')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/you have been enrolled in cloud architecture masterclass/i)).toBeVisible();
    });
  });
});
