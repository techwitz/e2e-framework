import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class DigitalPassportPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/learner/my-passport');
  }

  readonly passportSummary = this.page.locator('[data-testid="passport-summary"], main');

  async assertPassportLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*passport/);
  }
}
