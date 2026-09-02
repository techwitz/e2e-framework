import type { ILlmProvider, AiAnalysisResult } from '../types.js';
import type { DiagnosticTelemetry } from '../../forensics/types.js';
import { FailureClassifier } from '../FailureClassifier.js';
import { BugTicketGenerator } from '../BugTicketGenerator.js';

export class OllamaProvider implements ILlmProvider {
  /**
   * `hostUrl`/`model` must be passed in explicitly by the consuming application if you want
   * anything other than these generic local defaults — this framework never reads an
   * `OLLAMA_HOST`/`OLLAMA_MODEL` env var (or any config file) itself. Read your own env var in
   * your own config and pass the value through `AiHtmlReporterOptions.aiOllamaHost`/
   * `aiOllamaModel` / `AiFailureAnalyzer`'s constructor.
   */
  constructor(
    private readonly hostUrl = 'http://127.0.0.1:11434',
    private readonly model = 'llama3',
  ) {}

  async analyzeFailure(
    telemetry: DiagnosticTelemetry,
    consoleLogs: string[],
    harSnippet?: string,
  ): Promise<AiAnalysisResult> {
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

      const response = await fetch(`${this.hostUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama local error: ${response.statusText}`);
      }

      const json = await response.json();
      const outputText = json.response ?? '';
      const category = FailureClassifier.classifyHeuristically(outputText, consoleLogs);

      return {
        category,
        summary: telemetry.testTitle,
        rootCause: outputText,
        confidencePercent: 90,
        bugReportMarkdown: BugTicketGenerator.generateMarkdownTicket(telemetry, category, outputText),
      };
    } catch (err: any) {
      const category = FailureClassifier.classifyHeuristically(telemetry.error, consoleLogs);
      const rootCause = `Local Ollama unreachable (${err.message}). Fallback: ${telemetry.error}`;
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
