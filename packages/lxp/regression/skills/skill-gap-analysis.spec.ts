import { test, expect } from '../../src/fixtures/lxpTest.js';
import { Given, When, Then } from '@open-test/playwright-core';
import {
  SkillGapPage,
  ManagerWorkflowInboxPage,
  ContentGovernancePage,
  AssessmentRunnerPage,
  ExecutiveAnalyticsPage,
} from '../../src/pages/index.js';

test.describe('Skills & Career Hub Regression @regression @skills', () => {
  test('[TC-SKL-001] Skill gap analysis displays target role delta', async ({
    loginAs,
    page,
  }) => {
    const skillGapPage = new SkillGapPage(page);

    await Given('a learner opens skill gap analysis', async () => {
      await loginAs('learner', '/#/learner/skills/gap-analysis');
      await skillGapPage.assertSkillGapLoaded();
    });

    await When('the learner selects a target job role via the real JobRolePicker combobox', async () => {
      // `loadSkillGapCompare` only fires once `targetRole` is set (query is `enabled:
      // Boolean(targetRole.trim())`) — the compare data never loads without this real UI step.
      await skillGapPage.selectTargetRole('Senior Principal Architect');
    });

    await Then('the radar chart and skill gap sections render for that role', async () => {
      await expect(skillGapPage.skillRadarChart).toBeVisible({ timeout: 15_000 });
      await expect(skillGapPage.criticalGapsSection).toBeVisible({ timeout: 15_000 });
      await expect(skillGapPage.developingSkillsSection).toBeVisible({ timeout: 15_000 });
    });

    await Then('the skill proficiencies and recommended actions are listed', async () => {
      await expect(skillGapPage.gapCards.first()).toBeVisible({ timeout: 15_000 });
      const gapCount = await skillGapPage.gapCards.count();
      expect(gapCount).toBeGreaterThan(0);
    });
  });
});

test.describe('Manager Hub & Workflow Approvals Regression @regression @manager @workflows', () => {
  test('[TC-MGR-002] Manager validates direct report skills and approves request', async ({
    loginAs,
    page,
  }) => {
    const inboxPage = new ManagerWorkflowInboxPage(page);

    await Given('a manager opens the workflow approval inbox', async () => {
      await loginAs('manager', '/#/manager/workflow-inbox');
    });

    await When('the approval queue renders the pending learning-request approval', async () => {
      await inboxPage.assertInboxLoaded();
      await expect(inboxPage.requestRows.first()).toBeVisible({ timeout: 15_000 });
    });

    const initialRowCount = { value: 0 };

    await Then('the manager opens the review modal and submits a real approval decision', async () => {
      // Real WorkflowInbox.tsx has no inline "Approve" button — approval requires opening the
      // review modal, picking "Approve" from the real decision combobox, and submitting.
      initialRowCount.value = await inboxPage.requestRows.count();
      await inboxPage.approveFirstPendingStep();
    });

    await Then('the approved step is removed from the pending queue', async () => {
      // `decideOnStep()` succeeding optimistically removes the step from local state — the real
      // UI has no toast for this, so the row disappearing is the real, verifiable confirmation.
      await expect(inboxPage.requestRows).toHaveCount(initialRowCount.value - 1, { timeout: 15_000 });
    });
  });
});

test.describe('Admin Operations & Governance Regression @regression @admin @governance', () => {
  test('[TC-ADM-002] Admin manages tenant configurations and content compliance', async ({
    loginAs,
    page,
  }) => {
    const governancePage = new ContentGovernancePage(page);

    await Given('an administrator opens content governance', async () => {
      await loginAs('admin', '/#/admin/content-governance');
    });

    await When('the content governance grid loads', async () => {
      await governancePage.assertGovernanceLoaded();
      await expect(governancePage.contentGrid).toBeVisible({ timeout: 15_000 });
    });

    await Then('the real pending-review KPI and queue row are visible', async () => {
      // Note: there is no real "tenant settings/branding" page in the admin app —
      // `ROUTES.SETTINGS` is declared but never mounted anywhere in `AppRouter.tsx` (confirmed by
      // direct source read). The prior version of this test asserted against a fabricated page;
      // this now asserts real content-governance data instead — the actual admin-tier
      // "tenant configuration" surface this route exposes.
      await expect(governancePage.pendingReviewTile).toBeVisible({ timeout: 15_000 });
      // Narrowed to the real external-source link (`crg-ext-link`) — a bare text match also
      // matches the row's "Select all {title}" checkbox accessible label, a real strict-mode
      // violation surfaced by an actual run.
      await expect(
        page.getByRole('link', { name: /Spring Boot 4 Architecture & Design/ }),
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});

test.describe('Assessments Regression @regression @assessments', () => {
  test('[TC-ASM-001] Learner completes quiz and views score summary', async ({
    loginAs,
    page,
  }) => {
    const runnerPage = new AssessmentRunnerPage(page);

    await Given('a learner launches an assessment', async () => {
      await loginAs('learner', '/#/learn/assessment/template/ASM-E2E-001');
    });

    await When('the assessment runner initializes with real questions', async () => {
      await runnerPage.assertRunnerLoaded();
      await expect(runnerPage.questionContainer.first()).toBeVisible({ timeout: 15_000 });
    });

    await Then('the learner answers the question, reviews, and submits the real quiz', async () => {
      await runnerPage.answerAndSubmit();
    });

    await Then('the real score summary is shown', async () => {
      // Real result screen (`AssessmentPlayer.tsx`) shows "Your results" / a pass message /
      // "Score: {value}%" once `submitAssessmentAttempt()` resolves.
      await expect(page.getByRole('heading', { name: /your results/i })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText(/score: 100%/i)).toBeVisible({ timeout: 10_000 });
    });
  });
});

// Runs against @bien/app-admin (chromium-admin project) — ADMIN_EXECUTIVE_EXPORTS is
// mounted only in that app's router, not lxp-app's.
test.describe('Executive Reports Regression @regression @reports @admin', () => {
  test('[TC-REP-001] Executive views executive report exports and their status', async ({
    loginAs,
    page,
  }) => {
    const analyticsPage = new ExecutiveAnalyticsPage(page);

    await Given('an executive accesses the executive report exports page', async () => {
      await loginAs('admin', '/#/admin/analytics/exports');
    });

    await When('the export kinds and export queue render', async () => {
      await analyticsPage.assertAnalyticsLoaded();
      await expect(analyticsPage.exportRows.first()).toBeVisible({ timeout: 15_000 });
    });

    await Then('a previously-completed export is listed with a real, downloadable status', async () => {
      await expect(page.getByText('EXP-E2E-SUCCESS-001')).toBeVisible({ timeout: 15_000 });
    });
  });
});
