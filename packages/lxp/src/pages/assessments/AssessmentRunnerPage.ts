import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class AssessmentRunnerPage extends BasePage {
  constructor(page: Page) {
    // Real mounted route is LEARNER_ASSESSMENT_TEMPLATE ('/learn/assessment/template/:templateCode',
    // frontend/apps/lxp-app/src/routes/learnerAssessmentRoutes.tsx via AssessmentTemplateRunnerPage).
    // LEARNER_ASSESSMENT_RUNNER is declared in @bien/routes but not mounted anywhere in the app.
    super(page, '/#/learn/assessment/template');
  }

  readonly questionContainer = this.page.locator('fieldset.ap-fieldset');
  /** First question's real radio option — `AssessmentQuestionAnswer.tsx`'s default branch
   * renders a real `RadioGroup` for MCQ-type questions. */
  readonly firstAnswerOption = this.page.getByRole('radio').first();
  /** Real form-submit control (`shell.coursePlayer.assessmentReviewCta` = "Review answers") —
   * with `player_mode: 'ALL_AT_ONCE'` this takes the learner straight to the review screen. */
  readonly reviewAnswersButton = this.page.getByRole('button', { name: /review answers/i });
  /** Real final submit control on the review screen
   * (`shell.coursePlayer.assessmentReviewSubmit` = "Submit assessment") — blocked by the real
   * component until every question has an answer. */
  readonly submitAssessmentButton = this.page.getByRole('button', { name: /submit assessment/i });

  async assertRunnerLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*assessment/);
  }

  /** Real end-to-end flow: answer the first question, advance to review, submit. */
  async answerAndSubmit(): Promise<void> {
    await expect(this.firstAnswerOption).toBeVisible({ timeout: 15_000 });
    await this.firstAnswerOption.check();
    await this.reviewAnswersButton.click();
    await expect(this.submitAssessmentButton).toBeVisible({ timeout: 10_000 });
    await this.submitAssessmentButton.click();
  }
}
