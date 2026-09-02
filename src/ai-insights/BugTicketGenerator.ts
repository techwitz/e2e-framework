import type { DiagnosticTelemetry } from '../forensics/types.js';
import type { FailureCategory } from './types.js';

export class BugTicketGenerator {
  static generateMarkdownTicket(
    telemetry: DiagnosticTelemetry,
    category: FailureCategory,
    rootCause: string,
    remediation?: string,
  ): string {
    return `# [BUG] ${category} ${telemetry.testTitle}

## 1. Failure Summary
- **Test File**: \`${telemetry.testFile}\`
- **Category**: \`${category}\`
- **Browser/Environment**: \`${telemetry.browser}\` (Worker ${telemetry.workerIndex})
- **Duration**: \`${telemetry.durationMs}ms\`
- **URL at Failure**: \`${telemetry.urlAtFailure ?? 'N/A'}\`
- **Timestamp**: \`${telemetry.timestamp}\`

## 2. Root Cause Analysis
${rootCause}

## 3. Error & Stack Trace
\`\`\`
${telemetry.error ?? 'No explicit error message'}
${telemetry.stack ?? ''}
\`\`\`

${
  remediation
    ? `## 4. Suggested Remediation
\`\`\`typescript
${remediation}
\`\`\`
`
    : ''
}
## 5. Diagnostic Artifacts
- Playwright Trace: \`trace.zip\`
- Network HAR: \`network.har\`
- Console Logs: \`console.log\`
- Telemetry: \`telemetry.json\`
`;
  }
}
