import { expect, type Page, type Locator } from '@playwright/test';

export interface VisualMatchOptions {
  maskSelectors?: string[];
  maxDiffPixelRatio?: number;
  threshold?: number;
}

export class VisualMatcher {
  static async assertSnapshot(
    pageOrLocator: Page | Locator,
    snapshotName: string,
    options: VisualMatchOptions = {},
  ): Promise<void> {
    const masks: Locator[] = [];
    if (options.maskSelectors) {
      const page = 'page' in pageOrLocator ? pageOrLocator.page() : pageOrLocator;
      for (const sel of options.maskSelectors) {
        masks.push(page.locator(sel));
      }
    }

    await expect(pageOrLocator as any).toHaveScreenshot(snapshotName, {
      mask: masks,
      maxDiffPixelRatio: options.maxDiffPixelRatio ?? 0.02,
      threshold: options.threshold ?? 0.2,
      animations: 'disabled',
    });
  }
}
