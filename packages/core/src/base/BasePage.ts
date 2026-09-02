import { type Page, type Locator, expect } from '@playwright/test';

export abstract class BasePage {
  // Common Header & Shell Elements
  readonly toastContainer: Locator;
  readonly loadingSpinner: Locator;
  readonly modalDialog: Locator;
  readonly modalConfirmButton: Locator;
  readonly modalCancelButton: Locator;

  constructor(
    readonly page: Page,
    readonly path: string = '',
  ) {
    this.toastContainer = this.page.locator('[data-testid="toast-container"], [role="alert"], [aria-live="polite"]');
    this.loadingSpinner = this.page.locator('[data-testid="loading-spinner"], [aria-busy="true"]');
    this.modalDialog = this.page.locator('[role="dialog"], [data-testid="modal-container"]');
    this.modalConfirmButton = this.modalDialog.getByRole('button', { name: /confirm|ok|yes|save|submit|proceed|agree/i });
    this.modalCancelButton = this.modalDialog.getByRole('button', { name: /cancel|close|no|discard/i });
  }

  async navigate(pathOverride?: string): Promise<void> {
    const target = pathOverride ?? this.path;
    await this.page.goto(target, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForSpinnerToDisappear(timeout = 10_000): Promise<void> {
    if (await this.loadingSpinner.first().isVisible().catch(() => false)) {
      await expect(this.loadingSpinner.first()).toBeHidden({ timeout });
    }
  }

  async expectToast(messagePattern: string | RegExp, timeout = 10_000): Promise<void> {
    await expect(this.toastContainer.filter({ hasText: messagePattern })).toBeVisible({ timeout });
  }

  async fill(locator: Locator, text: string): Promise<void> {
    await expect(locator).toBeVisible();
    await locator.fill(text);
  }

  async click(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
    await expect(locator).toBeEnabled();
    await locator.click();
  }

  async confirmModal(): Promise<void> {
    await expect(this.modalDialog).toBeVisible();
    await this.modalConfirmButton.click();
    await expect(this.modalDialog).toBeHidden();
  }

  async cancelModal(): Promise<void> {
    await expect(this.modalDialog).toBeVisible();
    await this.modalCancelButton.click();
    await expect(this.modalDialog).toBeHidden();
  }
}
