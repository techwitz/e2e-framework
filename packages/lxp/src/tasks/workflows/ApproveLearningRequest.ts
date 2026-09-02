import { BaseTask } from '@open-test/playwright-core';

export interface ApproveLearningRequestInput {
  taskCode: string;
  comments?: string;
}

export class ApproveLearningRequestTask extends BaseTask<ApproveLearningRequestInput, void> {
  async performAs({ taskCode, comments }: ApproveLearningRequestInput): Promise<void> {
    await this.page.goto('/#/manager/workflow-inbox', { waitUntil: 'domcontentloaded' });
  }
}
