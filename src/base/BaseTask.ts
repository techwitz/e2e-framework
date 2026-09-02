import type { Page } from '@playwright/test';

export abstract class BaseTask<TInput = void, TOutput = void> {
  constructor(protected readonly page: Page) {}

  abstract performAs(input: TInput): Promise<TOutput>;
}
