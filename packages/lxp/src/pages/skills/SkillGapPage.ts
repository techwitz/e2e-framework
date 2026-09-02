import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class SkillGapPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/learner/skills/gap-analysis');
  }

  /** Real `JobRolePicker` (SearchableSelect) trigger — accessible name from i18n `phase4.targetRoleLabel`. */
  readonly targetRolePicker = this.page.getByRole('combobox', { name: /target job role/i });
  readonly targetRoleOption = (label: string | RegExp) => this.page.getByRole('option', { name: label });

  // `phase5.skillGapChartAria`/`phase5.skillGapChartTitle` have no translation entry anywhere in
  // the i18n catalog (confirmed by search) — asserting their exact rendered text would be a guess.
  // `TokenRadarChart` only renders once `allSkills.length > 0`, so its real, unambiguous signal is
  // the chart element itself appearing inside main content once a role is selected.
  readonly skillRadarChart = this.page.locator('main').locator('canvas, svg').first();
  readonly criticalGapsSection = this.page.getByRole('heading', { name: /critical gaps/i });
  readonly developingSkillsSection = this.page.getByRole('heading', { name: /developing skills/i });
  readonly matchedSkillsSection = this.page.getByRole('heading', { name: /matched skills/i });
  readonly gapCards = this.page.locator('.lxp-card--sm');

  async assertSkillGapLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*skills/);
  }

  /** Opens the real `JobRolePicker` combobox and selects the given role, which is what
   * gates `loadSkillGapCompare` (`enabled: Boolean(targetRole.trim())`) — the page renders no
   * gap data at all until this real UI interaction happens. */
  async selectTargetRole(label: string | RegExp): Promise<void> {
    await expect(this.targetRolePicker).toBeVisible({ timeout: 15_000 });
    await this.targetRolePicker.click();
    const option = this.targetRoleOption(label);
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();
  }
}
