export interface DiagnosticTelemetry {
  testTitle: string;
  testFile: string;
  durationMs: number;
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  error?: string;
  stack?: string;
  browser: string;
  viewport?: { width: number; height: number };
  urlAtFailure?: string;
  timestamp: string;
  personaRole?: string;
  workspaceCode?: string;
  gitCommitSha?: string;
  gitBranch?: string;
  workerIndex: number;
}

export interface DiagnosticBundleArtifacts {
  harPath?: string;
  tracePath?: string;
  videoPath?: string;
  screenshotPath?: string;
  consoleLogPath?: string;
  telemetryPath: string;
  aiReportPath?: string;
}
