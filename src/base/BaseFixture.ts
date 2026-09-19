import { test as baseTest, type TestType } from '@playwright/test';

/** Plain `@playwright/test` `test`, re-exported for consumers that don't need any of this
 * framework's extended fixtures — the common case for a component-library E2E suite whose specs
 * only need `{ page }`. */
export { baseTest };

export interface BaseFixtureOptions {
  autoLogConsoleErrors?: boolean;
}

export class BaseFixture {
  static createExtendedFixture<T extends Record<string, any>>(
    fixtures: Record<string, any>,
    options: BaseFixtureOptions = { autoLogConsoleErrors: true },
  ): TestType<any, any> {
    return baseTest.extend(fixtures);
  }
}
