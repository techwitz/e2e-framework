import { BaseTask } from '@open-test/playwright-core';

export interface CreateCourseInput {
  title: string;
  category: string;
}

export class CreateAndPublishCourseTask extends BaseTask<CreateCourseInput, void> {
  async performAs({ title, category }: CreateCourseInput): Promise<void> {
    await this.page.goto('/#/admin/content', { waitUntil: 'domcontentloaded' });
  }
}
