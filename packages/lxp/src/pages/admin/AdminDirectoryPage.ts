import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class AdminDirectoryPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/admin/users');
  }

  readonly userTable = this.page.locator('table, [data-testid="user-table"]');
  // Real UsersPage (frontend/apps/admin/src/pages/UsersPage.tsx) is a read-only directory —
  // there's no "add user" action; the real per-row/toolbar action is a refresh control.
  readonly refreshButton = this.page.getByRole('button', { name: /refresh/i });

  async assertDirectoryLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*admin/);
  }
}
