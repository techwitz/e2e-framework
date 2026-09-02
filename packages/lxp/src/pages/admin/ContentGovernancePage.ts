import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ContentGovernancePage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/admin/content-governance');
  }

  // Real grid is a `ServerDataGrid` (ContentReviewGrid.tsx) — renders a real `<table>`, not a
  // fabricated data-testid.
  readonly contentGrid = this.page.getByRole('table');
  // Real KPI tile — StatCard pattern, no data-testid (see AchievementsPage.ts for the same real
  // pattern). NOTE: a real product i18n gap, confirmed by direct source read — this page uses
  // `useT(I18N_NAMESPACES.TENANT)` (ContentGovernancePage.tsx, admin app), but
  // `frontend/packages/i18n/src/catalog.ts` only has a `host.admin.contentGovernance.pendingReview`
  // = "Pending review" entry; there is no `tenant.admin.contentGovernance.pendingReview` entry at
  // all. i18next falls back to rendering the raw key text when a translation is missing, so the
  // real, current rendered text is the literal key `contentGovernance.pendingReview`, not "Pending
  // review". Asserting the real text here (not the intended-but-missing translation) — flag for a
  // product-side i18n catalog fix, not a test-framework workaround.
  readonly pendingReviewTile = this.page.locator('.bien-sc-title', {
    hasText: 'contentGovernance.pendingReview',
  });

  async assertGovernanceLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/content-governance/);
  }
}
