import type { DiagnosticTelemetry } from '../forensics/types.js';

export type FailureCategory =
  | '[PRODUCT_BUG]'
  | '[API_REGRESSION]'
  | '[LOCATOR_DRIFT]'
  | '[ENVIRONMENT_TIMEOUT]'
  | '[TEST_DATA_MISMATCH]'
  | '[UNKNOWN_FAILURE]';

export interface AiAnalysisResult {
  category: FailureCategory;
  summary: string;
  rootCause: string;
  confidencePercent: number;
  remediationSnippet?: string;
  bugReportMarkdown: string;
}

export interface ILlmProvider {
  analyzeFailure(
    telemetry: DiagnosticTelemetry,
    consoleLogs: string[],
    harSnippet?: string,
  ): Promise<AiAnalysisResult>;
}
