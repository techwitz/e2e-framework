import type { ILlmProvider, AiAnalysisResult } from '../types.js';
import type { DiagnosticTelemetry } from '../../forensics/types.js';
import { FailureClassifier } from '../FailureClassifier.js';
import { BugTicketGenerator } from '../BugTicketGenerator.js';

export class OpenAiProvider implements ILlmProvider {
  /**
   * `apiKey` must be passed in explicitly by the consuming application — this framework never
   * reads any AI-vendor env var (or secrets file) itself. Read your own `OPENAI_API_KEY` (or
   * whatever your app calls it) in your own config and pass the value through
   * `AiHtmlReporterOptions.aiApiKey` / `AiFailureAnalyzer`'s constructor.
   */
  constructor(private readonly apiKey?: string) {}

  async analyzeFailure(
    telemetry: DiagnosticTelemetry,
    consoleLogs: string[],
    harSnippet?: string,
  ): Promise<AiAnalysisResult> {
    const category = FailureClassifier.classifyHeuristically(telemetry.error, consoleLogs);
    const rootCause = `OpenAI Provider analysis for ${telemetry.testTitle}: ${telemetry.error ?? 'Error'}`;
    return {
      category,
      summary: telemetry.testTitle,
      rootCause,
      confidencePercent: 85,
      bugReportMarkdown: BugTicketGenerator.generateMarkdownTicket(telemetry, category, rootCause),
    };
  }
}

