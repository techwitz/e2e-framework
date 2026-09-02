import { BaseTask } from '@open-test/playwright-core';
import { CatalogPage } from '../../pages/index.js';

export interface EnrollInCourseInput {
  courseTitleOrCode: string;
}

export class EnrollInCourseTask extends BaseTask<EnrollInCourseInput, void> {
  /** Real flow: there is no separate "course details + Enroll button" page. Opening a course
   * from the catalog navigates straight to `/courses/:id` (`CoursePlayerEngine.tsx`), whose
   * `resolveEnrollment()` silently calls `enrollSelfInCourse()` as a side effect if the learner
   * isn't already enrolled — so opening the course IS the real enrollment trigger. */
  async performAs({ courseTitleOrCode }: EnrollInCourseInput): Promise<void> {
    const catalog = new CatalogPage(this.page);
    await catalog.navigate();
    const enrollResponse = this.page.waitForResponse(
      (res) => res.url().includes('/v1/learner/enrollments') && res.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await catalog.openCourse(courseTitleOrCode);
    await enrollResponse;
  }
}
