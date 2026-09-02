import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class TeamSkillsMatrixPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/learner/team-skill-matrix');
  }

  readonly matrixTable = this.page.locator('[data-testid="team-skills-matrix"], table, main');

  async assertMatrixLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*skill/);
  }
}
