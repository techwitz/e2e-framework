import { StringUtils } from '@open-test/playwright-core';

export class UserPayloadBuilder {
  private payload = {
    user_code: StringUtils.randomBusinessKey('USR', 6),
    email: StringUtils.randomEmail('e2e-user'),
    roles: ['LEARNER'],
    first_name: 'Test',
    last_name: 'User',
    status: 'ACTIVE',
  };

  withRole(role: string) {
    this.payload.roles = [role];
    return this;
  }

  withEmail(email: string) {
    this.payload.email = email;
    return this;
  }

  build() {
    return { ...this.payload };
  }
}
