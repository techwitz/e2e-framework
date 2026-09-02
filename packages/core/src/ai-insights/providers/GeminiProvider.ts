import type { ILlmProvider, AiAnalysisResult } from '../types.js';
import type { DiagnosticTelemetry } from '../../forensics/types.js';
import { FailureClassifier } from '../FailureClassifier.js';
import { BugTicketGenerator } from '../BugTicketGenerator.js';

export class GeminiProvider implements ILlmProvider {
  constructor(private readonly apiKey = process.env.GEMINI_API_KEY) {}

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

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const json = await response.json();
      const outputText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const category = FailureClassifier.classifyHeuristically(outputText, consoleLogs);

      return {
        category,
        summary: telemetry.testTitle,
        rootCause: outputText,
        confidencePercent: 92,
        bugReportMarkdown: BugTicketGenerator.generateMarkdownTicket(telemetry, category, outputText),
      };
    } catch (err: any) {
      const category = FailureClassifier.classifyHeuristically(telemetry.error, consoleLogs);
      const rootCause = `Gemini call failed (${err.message}). Fallback: ${telemetry.error}`;
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
