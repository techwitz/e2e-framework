import { BaseTask } from '@open-test/playwright-core';

export interface SubmitLearningRequestInput {
  courseTitle: string;
  justification: string;
}

export class SubmitLearningRequestTask extends BaseTask<SubmitLearningRequestInput, void> {
  async performAs({ courseTitle, justification }: SubmitLearningRequestInput): Promise<void> {
    await this.page.goto('/#/learner/catalog', { waitUntil: 'domcontentloaded' });
  }
}
