export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffFactor?: number;
  timeoutMs?: number;
}

export class RetryHelper {
  static async pollUntil<T>(
    fn: () => Promise<T>,
    condition: (result: T) => boolean,
    options: RetryOptions = {},
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 10;
    let delayMs = options.delayMs ?? 500;
    const backoff = options.backoffFactor ?? 1.5;
    const timeoutMs = options.timeoutMs ?? 15_000;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await fn();
      if (condition(result)) {
        return result;
      }
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`[RetryHelper] Polling timed out after ${Date.now() - startTime}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.floor(delayMs * backoff);
    }
    throw new Error(`[RetryHelper] Max retries (${maxRetries}) reached without meeting condition`);
  }
}
