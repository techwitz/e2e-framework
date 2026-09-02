import { expect, type Locator } from '@playwright/test';

export class AssertionExtensions {
  static async assertElementVisibleWithText(locator: Locator, textPattern: string | RegExp, timeout = 10_000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
    await expect(locator).toContainText(textPattern);
  }

  static async assertAriaAttribute(locator: Locator, attribute: string, expectedValue: string): Promise<void> {
    await expect(locator).toHaveAttribute(attribute, expectedValue);
  }

  static async assertCountAtLeast(locator: Locator, minimumCount: number): Promise<void> {
    const count = await locator.count();
    expect(count).toBeGreaterThanOrEqual(minimumCount);
  }
}
