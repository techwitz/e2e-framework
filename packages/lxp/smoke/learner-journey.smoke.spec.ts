import { test, expect } from '../src/fixtures/lxpTest.js';
import { Given, When, Then, And } from '@open-test/playwright-core';
import { CoursePlayerPage } from '../src/pages/index.js';

// Note: ROUTES.COURSE_DETAIL ('/courses/:id') renders CoursePlayerPage directly (see
// frontend/apps/lxp-app/src/routes/AppRouter.tsx `CoursePlayerRoute`) — clicking a catalog
// card lands straight in the player, there is no separate "course details + enroll button"
// landing page on this route. The full POST /v1/learner/enrollments enrollment flow (with its
// PENDING_APPROVAL/ENROLLED branching) is covered for real in
// regression/catalog/catalog-search-filter.spec.ts TC-CRS-003 and
// data-driven/xlsx-catalog-enrollment.spec.ts — this smoke test stays scoped to the fast
// login -> dashboard -> search -> player -> notifications availability slice.
test.describe('Learner End-to-End Journey @smoke @critical @learner', () => {
  test('[TC-LRN-001] Complete Learner Slice: Login -> Dashboard -> Search -> Open Player -> Notifications', async ({
    page,
    loginAs,
    learnerDashboardPage,
    catalogPage,
    notificationsPage,
  }) => {
    await Given('an authenticated learner arrives at the learner home dashboard', async () => {
      await loginAs('learner', '/#/learner/home');
      await learnerDashboardPage.assertDashboardLoaded();
    });

    await When('the learner searches the catalog for course content', async () => {
      await catalogPage.navigate();
      await catalogPage.searchCourse('Spring Boot 4');
    });

    await And('the learner opens the course card and lands in the course player', async () => {
      // Real navigation trigger is the card's "Open {title}" link (CourseCard.tsx) — the card's
      // <h3> title text has no click handler, so the real accessible title text is needed here.
      await catalogPage.openCourse('Spring Boot 4 Architecture & Design');
      const player = new CoursePlayerPage(page);
      await player.assertPlayerLoaded();
    });

    await Then('the learner can verify notifications are accessible', async () => {
      await notificationsPage.navigate();
      await notificationsPage.assertNotificationsLoaded();
      await expect(page.getByText('Enrollment Approved')).toBeVisible({ timeout: 10_000 });
    });
  });
});
