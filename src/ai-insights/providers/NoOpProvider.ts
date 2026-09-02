import type { DiagnosticTelemetry } from '../../forensics/types.js';
import type { AiAnalysisResult, ILlmProvider } from '../types.js';

/**
 * The real, explicit default provider — AI analysis costs real money (API calls to
 * Gemini/OpenAI/Claude) or real local compute (Ollama), so it must never activate silently.
 * `AiFailureAnalyzer`'s default constructor argument is `'none'`, which resolves here: calling
 * `analyzeFailure()` on it throws immediately, loudly, before any network call is attempted —
 * a caller that reaches this class has a bug (constructed an analyzer without checking whether
 * AI analysis was actually requested), not a soft "just return nothing" situation to paper over.
 */
export class NoOpProvider implements ILlmProvider {
  async analyzeFailure(
    _telemetry: DiagnosticTelemetry,
    _consoleLogs: string[],
    _harSnippet?: string,
  ): Promise<AiAnalysisResult> {
    throw new Error(
      "AiFailureAnalyzer was constructed with provider 'none' (or no provider at all) and " +
        'analyze() was still called. AI analysis is opt-in — pass a real provider name ' +
        "('gemini' | 'openai' | 'claude' | 'ollama') to the constructor, or don't call " +
        'analyze() when AI analysis has not been explicitly requested.',
    );
  }
}
