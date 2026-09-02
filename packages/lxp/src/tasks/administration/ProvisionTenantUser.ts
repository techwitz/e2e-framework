import { BaseTask } from '@open-test/playwright-core';

export interface ProvisionUserInput {
  email: string;
  role: string;
}

export class ProvisionTenantUserTask extends BaseTask<ProvisionUserInput, void> {
  async performAs({ email, role }: ProvisionUserInput): Promise<void> {
    await this.page.goto('/#/admin/users', { waitUntil: 'domcontentloaded' });
  }
}
