import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ManagerDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/manager/team-dashboard');
  }

  readonly directReportsList = this.page.locator('[data-testid="direct-reports-list"], table, main');
  readonly pendingApprovalsCount = this.page.locator('[data-testid="pending-approvals-badge"]');

  async assertTeamDashboardLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*manager/);
  }
}
