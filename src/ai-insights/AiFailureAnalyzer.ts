import type { DiagnosticTelemetry } from '../forensics/types.js';
import type { ILlmProvider, AiAnalysisResult } from './types.js';
import { GeminiProvider } from './providers/GeminiProvider.js';
import { OpenAiProvider } from './providers/OpenAiProvider.js';
import { OllamaProvider } from './providers/OllamaProvider.js';
import { ClaudeProvider } from './providers/ClaudeProvider.js';
import { NoOpProvider } from './providers/NoOpProvider.js';
import { PiiRedactor } from '../forensics/PiiRedactor.js';

export type AiProviderName = 'gemini' | 'openai' | 'ollama' | 'claude' | 'none';

export interface AiProviderOptions {
  /**
   * API key for the selected provider (gemini/openai/claude). The framework never reads any
   * AI-vendor env var or secrets file itself — read your own `GEMINI_API_KEY` /
   * `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` (or whatever your application calls it, from an env
   * var or a secrets file) in your own config and pass the resolved value here.
   */
  apiKey?: string;
  /** Ollama server URL. Defaults to `http://127.0.0.1:11434` if not given. */
  ollamaHost?: string;
  /** Ollama model name. Defaults to `llama3` if not given. */
  ollamaModel?: string;
}

export class AiFailureAnalyzer {
  private provider: ILlmProvider;
  readonly providerName: AiProviderName;

  /**
   * AI analysis is opt-in, never the default — real API calls cost real money (or, for
   * Ollama, real local compute). The default here is `'none'`, which resolves to a
   * `NoOpProvider` that throws loudly if `analyze()` is ever actually called on it, rather
   * than silently making a paid call to whichever provider happened to be hardcoded as a
   * "convenient" default. Credentials (`options.apiKey`, etc.) are never read from process.env
   * by this class — the consuming application resolves them from its own env var or secrets
   * file and passes the resolved value in.
   */
  constructor(providerName: AiProviderName = 'none', options: AiProviderOptions = {}) {
    this.providerName = providerName;
    switch (providerName) {
      case 'gemini':
        this.provider = new GeminiProvider(options.apiKey);
        break;
      case 'openai':
        this.provider = new OpenAiProvider(options.apiKey);
        break;
      case 'ollama':
        this.provider = new OllamaProvider(options.ollamaHost, options.ollamaModel);
        break;
      case 'claude':
        this.provider = new ClaudeProvider(options.apiKey);
        break;
      case 'none':
      default:
        this.provider = new NoOpProvider();
        break;
    }
  }

  /** True once a real provider (not `NoOpProvider`) is configured — check this before calling
   * `analyze()` if you're not certain AI analysis was actually requested. */
  get isEnabled(): boolean {
    return this.providerName !== 'none';
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
