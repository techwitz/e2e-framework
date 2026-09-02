import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class CertificatesPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/learner/certificates');
  }

  readonly certificatesList = this.page.locator('[data-testid="certificates-list"], main');

  async assertCertificatesLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*certificates/);
  }
}
