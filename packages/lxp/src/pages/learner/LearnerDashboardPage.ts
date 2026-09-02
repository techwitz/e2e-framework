import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class LearnerDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/learner/home');
  }

  readonly headerGreeting = this.page.locator('h1, [data-testid="welcome-header"]');
  readonly inProgressSection = this.page.locator('[data-testid="in-progress-section"], section:has-text("Continue Learning")');
  readonly courseCards = this.page.locator('[data-testid="course-card"], article');

  async assertDashboardLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*(?:learner\/home|dashboard)/);
  }
}

export class MyLearningPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/learner/my-learning');
  }

  readonly enrolledCoursesGrid = this.page.locator('[data-testid="my-learning-grid"], main');

  async assertCoursePresent(courseCodeOrTitle: string | RegExp): Promise<void> {
    await expect(this.page.getByText(courseCodeOrTitle)).toBeVisible({ timeout: 15_000 });
  }
}
