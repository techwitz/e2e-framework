import { type Page, type Locator, expect } from '@playwright/test';

export abstract class BaseComponent {
  constructor(
    readonly root: Locator,
    readonly page: Page,
  ) {}

  async waitForVisible(timeout = 10_000): Promise<void> {
    await expect(this.root).toBeVisible({ timeout });
  }

  async waitForHidden(timeout = 10_000): Promise<void> {
    await expect(this.root).toBeHidden({ timeout });
  }
}
