import { BaseTask } from '@open-test/playwright-core';

export interface CompleteCourseLessonInput {
  courseCode: string;
}

export class CompleteCourseLessonTask extends BaseTask<CompleteCourseLessonInput, void> {
  async performAs({ courseCode }: CompleteCourseLessonInput): Promise<void> {
    await this.page.goto(`/#/course-player?course=${courseCode}`, { waitUntil: 'domcontentloaded' });
    const completeBtn = this.page.getByRole('button', { name: /complete|next lesson/i });
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
    }
  }
}
