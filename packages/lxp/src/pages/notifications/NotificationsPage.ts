import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class NotificationsPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/notifications');
  }

  // Scoped to #main-content — the bare `ul`/`main` locator this used to be matches the
  // shell's sidebar nav lists too (multiple <ul class="has-sidebar-list"> elements),
  // causing a Playwright strict-mode violation. #main-content is the actual page body.
  readonly notificationList = this.page.locator('#main-content').getByRole('list')
    .or(this.page.locator('[data-testid="notification-feed"]'));

  async assertNotificationsLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*notifications/);
  }
}
