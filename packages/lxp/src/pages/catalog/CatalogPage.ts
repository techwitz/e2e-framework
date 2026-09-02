import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class CatalogPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/learner/catalog');
  }

  readonly searchInput = this.page.getByRole('searchbox').or(this.page.getByPlaceholder(/search courses/i));
  readonly courseCards = this.page.locator('[data-testid="catalog-course-card"], article, div.cursor-pointer');
  // Real catalog result count is `<p role="status" class="lxp-cdb-count">` — narrowed from a bare
  // `getByRole('status')` after a real run found a second, unrelated `role="status"` element
  // ("You have seen all matching courses.") also renders on this page, causing a strict-mode
  // violation.
  readonly resultCount = this.page.locator('p.lxp-cdb-count[role="status"]');
  readonly levelFilterGroup = this.page.locator('[aria-labelledby="lxp-cdb-level-label"]');

  async searchCourse(term: string): Promise<void> {
    if (await this.searchInput.isVisible()) {
      await this.fill(this.searchInput, term);
    }
  }

  /** Toggles a level facet chip (BEGINNER/INTERMEDIATE/ADVANCED) in the real catalog filter bar. */
  levelFilterChip(level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') {
    return this.levelFilterGroup.getByRole('button', { name: new RegExp(level, 'i') });
  }

  async filterByLevel(level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'): Promise<void> {
    const chip = this.levelFilterChip(level);
    await expect(chip).toBeVisible({ timeout: 10_000 });
    await chip.click();
  }

  /** Real navigation trigger is the card's "Open {title}" control (`CourseCard.tsx`'s
   * `LinkButton`, accessible name from i18n `catalog.openCourse` = "Open {{title}}") — the card's
   * `<h3>` title text itself has no click handler at all. */
  async openCourse(title: string): Promise<void> {
    const openLink = this.page.getByRole('link', { name: new RegExp(`open ${escapeRegExp(title)}`, 'i') });
    await expect(openLink).toBeVisible({ timeout: 10_000 });
    await openLink.click();
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class CoursePlayerPage extends BasePage {
  constructor(page: Page) {
    // Real route is /courses/:id (packages/routes/src/routes.ts COURSE_DETAIL) — reached via
    // navigation from the catalog/details page in practice, not direct .navigate() with an id.
    super(page, '/#/courses');
  }

  // Real root container class from CoursePlayerEngine.tsx — dropped the generic 'main' fallback
  // this locator used to carry, since 'main' also matches unrelated pages (e.g. the catalog page
  // itself), which let assertPlayerLoaded() pass even when navigation to the player never
  // actually happened.
  readonly lessonPlayer = this.page.locator('.lxp-course-player-engine, video, iframe, [data-testid="lesson-content"]');
  readonly nextLessonButton = this.page.getByRole('button', { name: /next lesson|complete|continue/i });
  readonly progressBar = this.page.getByRole('progressbar');

  async assertPlayerLoaded(): Promise<void> {
    await expect(this.lessonPlayer.first()).toBeVisible({ timeout: 15_000 });
  }

  /** Reads the player's real lesson-progress indicator (`role="progressbar"` / `aria-valuenow`). */
  async getOverallProgressPercent(): Promise<number> {
    await expect(this.progressBar.first()).toBeVisible({ timeout: 15_000 });
    const valueNow = await this.progressBar.first().getAttribute('aria-valuenow');
    return valueNow ? Number(valueNow) : 0;
  }
}
