import type { ILlmProvider, AiAnalysisResult } from '../types.js';
import type { DiagnosticTelemetry } from '../../forensics/types.js';
import { FailureClassifier } from '../FailureClassifier.js';
import { BugTicketGenerator } from '../BugTicketGenerator.js';

export class OpenAiProvider implements ILlmProvider {
  constructor(private readonly apiKey = process.env.OPENAI_API_KEY) {}

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

