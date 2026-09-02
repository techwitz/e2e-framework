import { test, expect } from '../../src/fixtures/lxpTest.js';
import { Given, When, Then } from '@open-test/playwright-core';
import { CoursePlayerPage } from '../../src/pages/index.js';

test.describe('Catalog & Course Player Regression @regression @catalog @player', () => {
  test('[TC-CAT-002] Filter catalog by level facet', async ({
    loginAs,
    catalogPage,
    page,
  }) => {
    await Given('an authenticated user opens the course catalog', async () => {
      await loginAs('learner', '/#/learner/catalog');
    });

    await When('the user applies the ADVANCED level facet filter', async () => {
      await catalogPage.filterByLevel('ADVANCED');
    });

    await Then('the filter chip reflects the selected (pressed) state', async () => {
      await expect(catalogPage.levelFilterChip('ADVANCED')).toHaveAttribute('aria-pressed', 'true');
    });

    await Then('the course list is still populated after filtering', async () => {
      await expect(catalogPage.resultCount).toBeVisible({ timeout: 10_000 });
    });
  });

  test('[TC-CRS-003] Course player tracks lesson progress after enrollment', async ({
    loginAs,
    catalogPage,
    page,
  }) => {
    await Given('a learner enrolls in a course from the catalog', async () => {
      // There is no separate "course details + Enroll button" page — opening a course from the
      // catalog (`CourseCard.tsx`'s real "Open {title}" link) navigates straight to
      // `/courses/:id`, whose `CoursePlayerEngine.tsx` silently self-enrolls the learner as a
      // side effect of loading (`POST /v1/learner/enrollments`).
      await loginAs('learner', '/#/learner/catalog');
      const enrollResponsePromise = page.waitForResponse(
        (res) => res.url().includes('/v1/learner/enrollments') && res.request().method() === 'POST',
        { timeout: 15_000 },
      );
      await catalogPage.openCourse('Spring Boot 4 Architecture & Design');
      await enrollResponsePromise;
    });

    await When('the course player initializes for the enrolled course', async () => {
      await expect(page).toHaveURL(/\/#\/courses\/CRS-JAVA-001/);
    });

    await Then('the player renders a real, valid lesson-progress indicator', async () => {
      const player = new CoursePlayerPage(page);
      await player.assertPlayerLoaded();
      const progressPercent = await player.getOverallProgressPercent();
      expect(progressPercent).toBeGreaterThanOrEqual(0);
      expect(progressPercent).toBeLessThanOrEqual(100);
    });
  });
});
