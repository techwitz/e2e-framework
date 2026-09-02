import { test, expect } from '../src/fixtures/lxpTest.js';
import { withData } from '@open-test/playwright-core';
import { z } from 'zod';
import path from 'node:path';
import type { Response } from '@playwright/test';
import { CoursePlayerPage } from '../src/pages/index.js';

const EnrollmentRowSchema = z.object({
  courseCode: z.string(),
  title: z.string(),
  targetRole: z.string(),
  requiresApproval: z.string().or(z.boolean()),
  expectedStatus: z.string(),
});

type EnrollmentRow = z.infer<typeof EnrollmentRowSchema>;

const xlsxPath = path.resolve(process.cwd(), 'src/data/courses/enrollment-rules.xlsx');

test.describe('Data-Driven Excel Enrollment Matrix @ddt @catalog @enrollment', () => {
  withData<EnrollmentRow>(xlsxPath, { sheetName: 'EnrollmentMatrix' }, EnrollmentRowSchema).test(
    'Verify enrollment rules from Excel',
    async ({ page, loginAs, catalogPage }, row) => {
      // Real ENROLLMENT_STATUS enum (frontend/packages/api-client/src/index.ts) has no
      // 'AUTO_ENROLLED' value — the real EnrollmentItem.status for a non-approval enrollment
      // is 'ENROLLED'.
      const requiresApproval = row.requiresApproval === 'true' || row.requiresApproval === true;
      expect(row.expectedStatus).toBe(requiresApproval ? 'PENDING_APPROVAL' : 'ENROLLED');

      await loginAs('learner', '/#/learner/catalog');
      await catalogPage.searchCourse(row.title);

      // There is no separate "course details + Enroll button" page — `/courses/:id`
      // (`CoursePlayerEngine.tsx`) silently self-enrolls via `POST /v1/learner/enrollments` as a
      // side effect of loading, with no visible confirmation UI (no toast). The real, verifiable
      // signal is the actual enrollment API response's `status` field.
      const enrollResponsePromise = page.waitForResponse(
        (res: Response) => res.url().includes('/v1/learner/enrollments') && res.request().method() === 'POST',
        { timeout: 15_000 },
      );
      await catalogPage.openCourse(row.title);
      const enrollResponse = await enrollResponsePromise;
      const body = await enrollResponse.json();
      expect(body.status).toBe(row.expectedStatus);

      // Regardless of enrollment status, the course-player route always renders its lesson
      // content (`CoursePlayerEngine.tsx` doesn't gate content on approval state).
      const player = new CoursePlayerPage(page);
      await player.assertPlayerLoaded();
    },
    test,
  );
});
