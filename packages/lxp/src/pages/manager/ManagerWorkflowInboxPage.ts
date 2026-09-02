import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ManagerWorkflowInboxPage extends BasePage {
  constructor(page: Page) {
    super(page, '/#/manager/workflow-inbox');
  }

  /** Real WorkflowInbox.tsx renders each pending step as `<li class="lxp-card">` in `<ul class="lxp-list">`. */
  readonly requestRows = this.page.locator('ul.lxp-list li.lxp-card');
  /** Real per-row control opens a decision modal — there is no inline "Approve" button
   * (`shell.workflowInbox.review` = "Review"). */
  readonly reviewButton = this.page.getByRole('button', { name: /^review$/i });
  /** Real decision picker inside the modal (`shell.workflowInbox.decisionLabel` = "Decision"),
   * a SearchableSelect combobox with options Approve/Reject/Delegate/Return for rework. */
  readonly decisionPicker = this.page.getByRole('combobox', { name: /^decision$/i });
  readonly approveOption = this.page.getByRole('option', { name: /^approve$/i });
  /** Real submit control (`shell.workflowInbox.submit` = "Submit decision"). */
  readonly submitDecisionButton = this.page.getByRole('button', { name: /submit decision/i });

  async assertInboxLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*workflow/);
  }

  /** Real end-to-end approval: open the review modal for the first pending step, pick "Approve"
   * from the real decision combobox, and submit — `decideOnStep()` fires and the component
   * optimistically removes the step from the list on success (no toast component is used; the
   * confirmation is an a11y live-region announcement plus the row disappearing). */
  async approveFirstPendingStep(): Promise<void> {
    await this.reviewButton.first().click();
    await expect(this.decisionPicker).toBeVisible({ timeout: 10_000 });
    await this.decisionPicker.click();
    await this.approveOption.click();
    await this.submitDecisionButton.click();
  }
}
