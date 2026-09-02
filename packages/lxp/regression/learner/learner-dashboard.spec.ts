import { test, expect } from '../../src/fixtures/lxpTest.js';
import { Given, When, Then } from '@open-test/playwright-core';
import { AchievementsPage, LearnerCommunityPage } from '../../src/pages/index.js';

test.describe('Learner Portal Regression @regression @learner', () => {
  test('[TC-LRN-005] Learner views achievements, streak and gamification profile', async ({
    loginAs,
    page,
  }) => {
    const achievementsPage = new AchievementsPage(page);

    await Given('an authenticated learner navigates to achievements', async () => {
      await loginAs('learner', '/#/learner/achievements');
    });

    await When('the achievements page loads', async () => {
      await achievementsPage.assertAchievementsLoaded();
      await expect(achievementsPage.streakTitle).toBeVisible({ timeout: 10_000 });
    });

    await Then('the streak count and earned badges are displayed', async () => {
      await expect(achievementsPage.streakValue).toHaveText('7');
      await expect(achievementsPage.badgesSection).toBeVisible({ timeout: 10_000 });
      await expect(achievementsPage.badgeChips.first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('7-Day Streak')).toBeVisible({ timeout: 10_000 });
    });
  });

  test('[TC-LRN-006] Learner inspects community discussions and replies', async ({
    loginAs,
    page,
  }) => {
    const communityPage = new LearnerCommunityPage(page);

    await Given('an authenticated learner visits community spaces', async () => {
      await loginAs('learner', '/#/learner/community');
    });

    await When('the community feed renders real spaces', async () => {
      await communityPage.assertCommunityLoaded();
      await expect(page.getByText('Engineering Guild')).toBeVisible({ timeout: 10_000 });
    });

    await Then('selecting a space loads and displays its real thread data', async () => {
      // Real component only fetches/renders a space's threads once explicitly selected
      // (`?space=:code` enables the threads query) — thread titles never appear beforehand.
      await communityPage.selectSpace('Engineering Guild');
      await expect(
        page.getByText('Best practices for Spring Modulith boundaries?'),
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
