import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class LearnerCommunityPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/learner/community');
  }

  readonly spacesList = this.page.locator('ul.lxp-community-space-list');
  readonly threadRows = this.page.locator('ul.lxp-community-thread-list li');

  async assertCommunityLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*community/);
  }

  /** Real component (`LearnerCommunityPage.tsx`) only fetches/renders a space's threads once a
   * space is explicitly selected — `selectSpace()` sets `?space=:code` in the URL, which is what
   * enables the threads query (`enabled: Boolean(selectedSpaceCode)`). Thread titles never
   * appear without this real interaction step first. */
  async selectSpace(name: string): Promise<void> {
    const spaceButton = this.page.getByRole('button', { name: new RegExp(name, 'i') });
    await expect(spaceButton).toBeVisible({ timeout: 15_000 });
    await spaceButton.click();
  }
}
