import type { TestInfo, Page } from '@playwright/test';
import type { DiagnosticTelemetry } from './types.js';

export class TelemetryCollector {
  static collect(testInfo: TestInfo, page?: Page, extra: Partial<DiagnosticTelemetry> = {}): DiagnosticTelemetry {
    return {
      testTitle: testInfo.title,
      testFile: testInfo.file,
      durationMs: testInfo.duration,
      status: testInfo.status ?? 'passed',
      error: testInfo.error?.message,
      stack: testInfo.error?.stack,
      browser: testInfo.project.name,
      viewport: page?.viewportSize() ?? undefined,
      urlAtFailure: page?.url(),
      timestamp: new Date().toISOString(),
      workerIndex: testInfo.workerIndex,
      gitCommitSha: process.env.GITHUB_SHA ?? process.env.GIT_COMMIT,
      gitBranch: process.env.GITHUB_REF_NAME ?? process.env.GIT_BRANCH,
      ...extra,
    };
  }
}
