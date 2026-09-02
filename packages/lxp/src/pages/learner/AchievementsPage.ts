import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class AchievementsPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/learner/achievements');
  }

  // Real streak value is a PageShell/PageKpiStrip KPI tile (StatCard), not a dedicated
  // "streak counter" element — no data-testid exists anywhere in the real component tree
  // (AchievementsPage.tsx / PageShell.tsx / StatCard.tsx, confirmed by direct source read).
  // Title text is i18n `achievements.streak` = "Day streak"; the numeric value renders in the
  // same StatCard's `.bien-sc-value` element.
  readonly streakTitle = this.page.locator('.bien-sc-title', { hasText: 'Day streak' });
  readonly streakValue = this.page
    .locator('.bien-sc-copy', { has: this.page.locator('.bien-sc-title', { hasText: 'Day streak' }) })
    .locator('.bien-sc-value');
  // Real badges render as `.lxp-ach-badge` spans inside a section labelled by i18n
  // `achievements.badgesRegion` = "Recent badges".
  readonly badgesSection = this.page.locator('section[aria-label="Recent badges"]');
  readonly badgeChips = this.badgesSection.locator('.lxp-ach-badge');

  async assertAchievementsLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*achievements/);
  }
}
