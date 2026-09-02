import type { DiagnosticTelemetry } from '../forensics/types.js';
import type { ILlmProvider, AiAnalysisResult } from './types.js';
import { GeminiProvider } from './providers/GeminiProvider.js';
import { OpenAiProvider } from './providers/OpenAiProvider.js';
import { OllamaProvider } from './providers/OllamaProvider.js';
import { ClaudeProvider } from './providers/ClaudeProvider.js';
import { PiiRedactor } from '../forensics/PiiRedactor.js';

export class AiFailureAnalyzer {
  private provider: ILlmProvider;

  constructor(providerName: 'gemini' | 'openai' | 'ollama' | 'claude' | 'none' = 'gemini') {
    switch (providerName) {
      case 'openai':
        this.provider = new OpenAiProvider();
        break;
      case 'ollama':
        this.provider = new OllamaProvider();
        break;
      case 'claude':
        this.provider = new ClaudeProvider();
        break;
      case 'gemini':
      default:
        this.provider = new GeminiProvider();
        break;
    }
  }

  async analyze(
    telemetry: DiagnosticTelemetry,
    consoleLogs: string[],
    harSnippet?: string,
  ): Promise<AiAnalysisResult> {
    const redactedTelemetry: DiagnosticTelemetry = {
      ...telemetry,
      error: telemetry.error ? PiiRedactor.redact(telemetry.error) : telemetry.error,
      stack: telemetry.stack ? PiiRedactor.redact(telemetry.stack) : telemetry.stack,
    };
    const redactedLogs = consoleLogs.map((line) => PiiRedactor.redact(line));
    const redactedHar = harSnippet ? PiiRedactor.redact(harSnippet) : harSnippet;
    return this.provider.analyzeFailure(redactedTelemetry, redactedLogs, redactedHar);
  }
}
