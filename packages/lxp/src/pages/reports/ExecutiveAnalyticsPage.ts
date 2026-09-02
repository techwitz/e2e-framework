import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Models the real AdminExecutiveExportsPage (frontend/apps/admin/src/pages/analytics) — an
 * executive-report export queue (one enqueue action button per ExecutiveReportKind, plus a
 * list of previously-enqueued export jobs), not a KPI dashboard. */
export class ExecutiveAnalyticsPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/admin/analytics/exports');
  }

  readonly kindsHeading = this.page.locator('.aee-kinds');
  readonly exportRows = this.page.locator('.aee-row');

  async assertAnalyticsLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*analytics|admin/);
    await expect(this.kindsHeading).toBeVisible({ timeout: 15_000 });
  }
}
