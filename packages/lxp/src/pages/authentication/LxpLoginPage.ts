import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';

export class LxpLoginPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/login');
  }

  readonly emailInput = this.page.getByLabel(/email/i);
  readonly passwordInput = this.page.getByLabel(/password/i);
  readonly continueButton = this.page.getByRole('button', { name: /continue|next|sign in/i });
  readonly signInButton = this.page.getByRole('button', { name: /^sign in$/i });
  readonly errorMessage = this.page.locator('[role="alert"], [data-testid="login-error"], .error-message');

  async login(email: string, pass: string): Promise<void> {
    await this.fill(this.emailInput, email);
    if (await this.continueButton.isVisible()) {
      await this.click(this.continueButton);
    }
    await this.fill(this.passwordInput, pass);
    await this.click(this.signInButton);
  }
}
