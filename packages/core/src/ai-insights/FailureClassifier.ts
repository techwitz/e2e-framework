import type { FailureCategory } from './types.js';

export class FailureClassifier {
  static classifyHeuristically(errorText = '', consoleLogs: string[] = []): FailureCategory {
    const combined = `${errorText} ${consoleLogs.join(' ')}`.toLowerCase();

    if (combined.includes('500 internal server error') || combined.includes('502 bad gateway') || combined.includes('503 service unavailable')) {
      return '[API_REGRESSION]';
    }
    if (combined.includes('waiting for locator') || combined.includes('element not found') || combined.includes('timed out waiting for getby')) {
      return '[LOCATOR_DRIFT]';
    }
    if (combined.includes('etimedout') || combined.includes('econnrefused') || combined.includes('net::err_connection_refused')) {
      return '[ENVIRONMENT_TIMEOUT]';
    }
    if (combined.includes('duplicate key') || combined.includes('foreign key constraint') || combined.includes('not found in workspace')) {
      return '[TEST_DATA_MISMATCH]';
    }
    if (combined.includes('expected') && combined.includes('received')) {
      return '[PRODUCT_BUG]';
    }
    return '[UNKNOWN_FAILURE]';
  }
}
