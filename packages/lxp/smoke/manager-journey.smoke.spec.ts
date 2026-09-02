import { test, expect } from '../src/fixtures/lxpTest.js';
import { Given, When, Then } from '@open-test/playwright-core';

test.describe('Manager Overview Availability Gate @smoke @critical @manager', () => {
  test('[TC-MGR-001] Manager logs in and views team dashboard', async ({
    loginAs,
    managerDashboardPage,
    page,
  }) => {
    await Given('an authenticated manager navigates to team oversight', async () => {
      await loginAs('manager', '/#/manager/team-dashboard');
    });

    await When('the manager team dashboard renders', async () => {
      await managerDashboardPage.assertTeamDashboardLoaded();
    });

    await Then('the at-risk team member widget renders real member data', async () => {
      await expect(managerDashboardPage.directReportsList).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Alex Mercer')).toBeVisible({ timeout: 10_000 });
    });
  });
});
