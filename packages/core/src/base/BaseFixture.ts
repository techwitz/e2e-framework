import { test as baseTest, type TestType } from '@playwright/test';

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
