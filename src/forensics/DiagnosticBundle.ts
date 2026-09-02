import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { DiagnosticTelemetry, DiagnosticBundleArtifacts } from './types.js';
import { PiiRedactor } from './PiiRedactor.js';

export class DiagnosticBundle {
  static async saveBundle(
    outputDir: string,
    telemetry: DiagnosticTelemetry,
    consoleLogs: string[],
    harPath?: string,
  ): Promise<DiagnosticBundleArtifacts> {
    await fs.mkdir(outputDir, { recursive: true });

    const redactedTelemetry: DiagnosticTelemetry = {
      ...telemetry,
      error: telemetry.error ? PiiRedactor.redact(telemetry.error) : telemetry.error,
      stack: telemetry.stack ? PiiRedactor.redact(telemetry.stack) : telemetry.stack,
    };

    const telemetryPath = path.join(outputDir, 'telemetry.json');
    await fs.writeFile(telemetryPath, JSON.stringify(redactedTelemetry, null, 2), 'utf-8');

    let consoleLogPath: string | undefined;
    if (consoleLogs.length > 0) {
      const redactedLogs = consoleLogs.map((line) => PiiRedactor.redact(line));
      consoleLogPath = path.join(outputDir, 'console.log');
      await fs.writeFile(consoleLogPath, redactedLogs.join('\n'), 'utf-8');
    }

    return {
      telemetryPath,
      consoleLogPath,
      harPath,
    };
  }
}
