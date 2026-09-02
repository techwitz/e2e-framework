import type { ILlmProvider, AiAnalysisResult } from '../types.js';
import type { DiagnosticTelemetry } from '../../forensics/types.js';
import { FailureClassifier } from '../FailureClassifier.js';
import { BugTicketGenerator } from '../BugTicketGenerator.js';

export class ClaudeProvider implements ILlmProvider {
  /**
   * `apiKey` must be passed in explicitly by the consuming application — this framework never
   * reads any AI-vendor env var (or secrets file) itself. Read your own `ANTHROPIC_API_KEY` (or
   * whatever your app calls it) in your own config and pass the value through
   * `AiHtmlReporterOptions.aiApiKey` / `AiFailureAnalyzer`'s constructor.
   */
  constructor(private readonly apiKey?: string) {}

  async analyzeFailure(
    telemetry: DiagnosticTelemetry,
    consoleLogs: string[],
    harSnippet?: string,
  ): Promise<AiAnalysisResult> {
    if (!this.apiKey) {
      const category = FailureClassifier.classifyHeuristically(telemetry.error, consoleLogs);
      const rootCause = `Heuristic Analysis: ${telemetry.error ?? 'Unknown error'}`;
      return {
        category,
        summary: telemetry.testTitle,
        rootCause,
        confidencePercent: 75,
        bugReportMarkdown: BugTicketGenerator.generateMarkdownTicket(telemetry, category, rootCause),
      };
    }

    try {
      const prompt = `Analyze this automated test failure:
Test: ${telemetry.testTitle}
File: ${telemetry.testFile}
Error: ${telemetry.error}
Stack: ${telemetry.stack}
URL: ${telemetry.urlAtFailure}
Console logs: ${consoleLogs.slice(-10).join('\n')}
HAR snippet: ${harSnippet?.slice(0, 1000) ?? 'N/A'}

Provide:
1. Failure category: [PRODUCT_BUG], [API_REGRESSION], [LOCATOR_DRIFT], [ENVIRONMENT_TIMEOUT], [TEST_DATA_MISMATCH]
2. Plain-English Root cause explanation
3. Recommended developer code fix`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const json = await response.json();
      const outputText = json.content?.[0]?.text ?? '';
      const category = FailureClassifier.classifyHeuristically(outputText, consoleLogs);

      return {
        category,
        summary: telemetry.testTitle,
        rootCause: outputText,
        confidencePercent: 95,
        bugReportMarkdown: BugTicketGenerator.generateMarkdownTicket(telemetry, category, outputText),
      };
    } catch (err: any) {
      const category = FailureClassifier.classifyHeuristically(telemetry.error, consoleLogs);
      const rootCause = `Claude call failed (${err.message}). Fallback: ${telemetry.error}`;
      return {
        category,
        summary: telemetry.testTitle,
        rootCause,
        confidencePercent: 70,
        bugReportMarkdown: BugTicketGenerator.generateMarkdownTicket(telemetry, category, rootCause),
      };
    }
  }
}
