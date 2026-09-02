import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import { AiFailureAnalyzer } from '../ai-insights/AiFailureAnalyzer.js';
import type { AiAnalysisResult } from '../ai-insights/types.js';
import type { DiagnosticTelemetry } from '../forensics/types.js';
import { PiiRedactor } from '../forensics/PiiRedactor.js';
import { FlakyQuarantineManager } from './FlakyQuarantineManager.js';

export type AiReportProvider = 'gemini' | 'openai' | 'ollama' | 'claude' | 'none';

export interface AiHtmlReporterOptions {
  /** Directory the report (and copied assets) are written to. Default: 'ai-html-report'. */
  outputDir?: string;
  /** Report file name within outputDir. Default: 'index.html'. */
  outputFile?: string;
  /**
   * Which LLM provider analyzes failures. Defaults to `process.env.AI_REPORT_PROVIDER`,
   * or 'none' (report still generates fully — thumbnails, video, traceability, flaky
   * detection — just without the AI panel; AI analysis is strictly opt-in so a report
   * never makes silent paid API calls).
   */
  aiProvider?: AiReportProvider;
  /** Title shown in the report header. Default: 'Test Execution Report'. */
  projectTitle?: string;
  /** Regex used to extract a traceability ID from the test title. Default matches `[TC-XXX-001]`. */
  testIdPattern?: RegExp;
  /** Path to the persistent flaky-test store. Default: '.flaky-quarantine.json' at cwd. */
  flakyStorePath?: string;
  /** Number of times a test must flake before being flagged for quarantine. Default: 3. */
  quarantineThreshold?: number;
}

interface ReportedTest {
  testId?: string;
  title: string;
  fullTitle: string;
  file: string;
  tags: string[];
  project: string;
  status: string;
  expectedStatus: string;
  isFlaky: boolean;
  retries: number;
  durationMs: number;
  error?: string;
  stack?: string;
  screenshotDataUri?: string;
  videoRelPath?: string;
  traceRelPath?: string;
  ai?: AiAnalysisResult;
  aiError?: string;
}

/**
 * A single, self-contained HTML report that ties together everything the framework already
 * collects but never assembled into one place: per-test screenshots/video/trace links, a
 * traceability matrix (test-ID -> title -> status, parsed from the `[TC-XXX-001]` convention
 * already used across specs), persistent flaky-test detection, and — opt-in, via
 * `aiProvider` — an AI-generated root-cause summary + suggested fix for every failure,
 * using the caller's own LLM API key (Gemini/OpenAI/Claude/local Ollama).
 *
 * Wire it in alongside Playwright's built-in reporters:
 * ```ts
 * reporter: [['list'], ['html'], ['@open-test/playwright-core/reporting/AiHtmlReporter', {
 *   aiProvider: process.env.AI_REPORT_PROVIDER as any,
 * }]]
 * ```
 */
export class AiHtmlReporter implements Reporter {
  private readonly options: Required<
    Pick<AiHtmlReporterOptions, 'outputDir' | 'outputFile' | 'projectTitle' | 'testIdPattern'>
  > & {
    aiProvider: AiReportProvider;
  };
  private readonly results: ReportedTest[] = [];
  private analyzer?: AiFailureAnalyzer;
  private assetsDir = '';
  private startedAt = 0;
  private rootDir = process.cwd();

  constructor(options: AiHtmlReporterOptions = {}) {
    const aiProvider =
      options.aiProvider ?? (process.env.AI_REPORT_PROVIDER as AiReportProvider | undefined) ?? 'none';

    this.options = {
      outputDir: options.outputDir ?? 'ai-html-report',
      outputFile: options.outputFile ?? 'index.html',
      projectTitle: options.projectTitle ?? 'Test Execution Report',
      testIdPattern: options.testIdPattern ?? /\[(TC-[A-Z]+-\d+)\]/,
      aiProvider,
    };

    if (aiProvider !== 'none') {
      this.analyzer = new AiFailureAnalyzer(aiProvider);
    }

    FlakyQuarantineManager.configure(
      options.flakyStorePath ?? path.resolve(process.cwd(), '.flaky-quarantine.json'),
      options.quarantineThreshold ?? 3,
    );
  }

  async onBegin(config: FullConfig, _suite: Suite): Promise<void> {
    this.startedAt = Date.now();
    this.rootDir = config.rootDir ?? process.cwd();
    await FlakyQuarantineManager.load();
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    // Tags (e.g. `@smoke @critical`) conventionally live on the enclosing `describe()` block's
    // title, not the individual `test()` title — matching against `test.title` alone (bare)
    // leaves the tags column empty. `titlePath()` includes the whole chain (project, every
    // enclosing describe, then the test itself), so match against the full path joined together.
    const titlePath = test.titlePath();
    const testIdMatch = test.title.match(this.options.testIdPattern);
    const tags = titlePath.join(' ').match(/@[a-zA-Z0-9_-]+/g) ?? [];
    const fullTitle = titlePath.slice(2).join(' › ');
    const projectName = test.parent.project()?.name ?? 'default';
    const isFlaky = result.status === 'passed' && test.results.length > 1;

    if (isFlaky) {
      FlakyQuarantineManager.recordFlake(test.title, test.location.file);
    }

    const screenshotDataUri = await this.readThumbnail(result);
    const videoRelPath = await this.copyLargeAttachment(result, ['video/webm', 'video/mp4'], 'video');
    const traceRelPath = await this.copyLargeAttachment(result, ['application/zip'], 'trace', 'trace');

    let ai: AiAnalysisResult | undefined;
    let aiError: string | undefined;
    const isFailure = result.status === 'failed' || result.status === 'timedOut';
    if (this.analyzer && isFailure) {
      try {
        ai = await this.runAiAnalysis(test, result, projectName);
      } catch (err) {
        aiError = err instanceof Error ? err.message : String(err);
      }
    }

    this.results.push({
      testId: testIdMatch?.[1],
      title: test.title,
      fullTitle,
      file: path.relative(this.rootDir, test.location.file).split(path.sep).join('/'),
      tags,
      project: projectName,
      status: result.status,
      expectedStatus: test.expectedStatus,
      isFlaky,
      retries: test.results.length - 1,
      durationMs: result.duration,
      error: result.error?.message ? PiiRedactor.redact(stripAnsi(result.error.message)) : undefined,
      stack: result.error?.stack ? PiiRedactor.redact(stripAnsi(result.error.stack)) : undefined,
      screenshotDataUri,
      videoRelPath,
      traceRelPath,
      ai,
      aiError,
    });
  }

  async onEnd(_result: FullResult): Promise<void> {
    await fs.mkdir(this.options.outputDir, { recursive: true });
    await FlakyQuarantineManager.persist();
    const html = this.renderHtml(Date.now() - this.startedAt);
    await fs.writeFile(path.join(this.options.outputDir, this.options.outputFile), html, 'utf-8');
  }

  printsToStdio(): boolean {
    return false;
  }

  // ---------------------------------------------------------------------------------------

  private async runAiAnalysis(
    test: TestCase,
    result: TestResult,
    projectName: string,
  ): Promise<AiAnalysisResult | undefined> {
    if (!this.analyzer) return undefined;
    const telemetry: DiagnosticTelemetry = {
      testTitle: test.title,
      testFile: path.relative(this.rootDir, test.location.file),
      durationMs: result.duration,
      status: result.status,
      error: result.error?.message ? stripAnsi(result.error.message) : undefined,
      stack: result.error?.stack ? stripAnsi(result.error.stack) : undefined,
      browser: projectName,
      urlAtFailure: undefined,
      timestamp: new Date().toISOString(),
      workerIndex: result.workerIndex,
    };
    const consoleLogs = [
      ...result.stdout.map((s) => stripAnsi(s.toString())),
      ...result.stderr.map((s) => stripAnsi(s.toString())),
    ];
    return this.analyzer.analyze(telemetry, consoleLogs);
  }

  private async readThumbnail(result: TestResult): Promise<string | undefined> {
    const shot = result.attachments.find(
      (a) => a.name === 'screenshot' || a.contentType.startsWith('image/'),
    );
    if (!shot) return undefined;
    try {
      const buf = shot.body ?? (shot.path ? await fs.readFile(shot.path) : undefined);
      if (!buf) return undefined;
      return `data:${shot.contentType};base64,${buf.toString('base64')}`;
    } catch {
      return undefined;
    }
  }

  /** Screenshots are small enough to embed inline; video/trace files are not — copy them
   * alongside the report and link relatively instead of bloating the HTML with base64 video. */
  private async copyLargeAttachment(
    result: TestResult,
    contentTypes: string[],
    label: string,
    matchName?: string,
  ): Promise<string | undefined> {
    const attachment = result.attachments.find(
      (a) => (matchName ? a.name === matchName : contentTypes.includes(a.contentType)) && a.path,
    );
    if (!attachment?.path) return undefined;
    try {
      if (!this.assetsDir) {
        this.assetsDir = path.join(this.options.outputDir, 'assets');
        await fs.mkdir(this.assetsDir, { recursive: true });
      }
      const ext = path.extname(attachment.path) || (label === 'trace' ? '.zip' : '');
      const destName = `${this.slug(result.workerIndex + '-' + attachment.name + '-' + Date.now())}${ext}`;
      const destPath = path.join(this.assetsDir, destName);
      await fs.copyFile(attachment.path, destPath);
      return path.join('assets', destName).split(path.sep).join('/');
    } catch {
      return undefined;
    }
  }

  private slug(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  // ---------------------------------------------------------------------------------------

  private renderHtml(totalDurationMs: number): string {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed' || r.status === 'timedOut').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;
    const flaky = this.results.filter((r) => r.isFlaky).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const flakyRecords = FlakyQuarantineManager.getAll();

    const traceabilityRows = this.results
      .map(
        (r) => `
        <tr class="trace-row status-${esc(r.status)}">
          <td>${esc(r.testId ?? '—')}</td>
          <td><a href="#test-${esc(r.file)}-${esc(r.title)}" onclick="return jumpTo(this)">${esc(r.title)}</a></td>
          <td>${esc(r.file)}</td>
          <td>${r.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(' ')}</td>
          <td><span class="badge badge-${esc(r.status)}">${esc(r.status)}</span></td>
        </tr>`,
      )
      .join('\n');

    const testCards = this.results
      .map((r, i) => this.renderTestCard(r, i))
      .join('\n');

    const flakyRows = flakyRecords
      .map(
        (f) => `
        <tr>
          <td>${esc(f.testTitle)}</td>
          <td>${esc(f.testFile)}</td>
          <td>${f.retryCount}</td>
          <td>${f.quarantined ? '<span class="badge badge-failed">quarantine</span>' : '<span class="badge badge-skipped">watching</span>'}</td>
          <td>${esc(f.lastFailureDate)}</td>
        </tr>`,
      )
      .join('\n');

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(this.options.projectTitle)}</title>
<style>${STYLES}</style>
</head>
<body>
  <header class="hdr">
    <h1>${esc(this.options.projectTitle)}</h1>
    <p class="meta">Generated ${esc(new Date().toLocaleString())} · ${formatDuration(totalDurationMs)} total</p>
  </header>

  <section class="summary">
    <div class="stat stat-total"><span class="n">${total}</span><span class="l">Total</span></div>
    <div class="stat stat-passed"><span class="n">${passed}</span><span class="l">Passed</span></div>
    <div class="stat stat-failed"><span class="n">${failed}</span><span class="l">Failed</span></div>
    <div class="stat stat-skipped"><span class="n">${skipped}</span><span class="l">Skipped</span></div>
    <div class="stat stat-flaky"><span class="n">${flaky}</span><span class="l">Flaky (this run)</span></div>
    <div class="stat stat-rate"><span class="n">${passRate}%</span><span class="l">Pass rate</span></div>
  </section>

  <nav class="tabs">
    <button class="tab-btn active" onclick="showTab('tests')">Tests</button>
    <button class="tab-btn" onclick="showTab('trace')">Traceability</button>
    <button class="tab-btn" onclick="showTab('flake')">Flaky History (${flakyRecords.length})</button>
  </nav>

  <section id="tab-tests" class="tab-panel">
    <div class="filters">
      <input id="filterInput" type="text" placeholder="Filter by title, file, tag…" oninput="applyFilter()">
      <label><input type="checkbox" id="failedOnly" onchange="applyFilter()"> Failed only</label>
    </div>
    <div id="testList">${testCards}</div>
  </section>

  <section id="tab-trace" class="tab-panel" style="display:none">
    <table class="data-table">
      <thead><tr><th>Test ID</th><th>Title</th><th>File</th><th>Tags</th><th>Status</th></tr></thead>
      <tbody>${traceabilityRows}</tbody>
    </table>
  </section>

  <section id="tab-flake" class="tab-panel" style="display:none">
    <p class="meta">Persisted across runs at the reporter's configured flaky-store path. A test is quarantine-flagged once its flake count crosses the configured threshold.</p>
    <table class="data-table">
      <thead><tr><th>Test</th><th>File</th><th>Flake count</th><th>State</th><th>Last flake</th></tr></thead>
      <tbody>${flakyRows || '<tr><td colspan="5" class="empty">No flaky tests recorded yet.</td></tr>'}</tbody>
    </table>
  </section>

  <script>${SCRIPT}</script>
</body>
</html>`;
  }

  private renderTestCard(r: ReportedTest, index: number): string {
    const anchorId = `test-${escId(r.file)}-${escId(r.title)}`;
    const aiPanel = r.ai
      ? `
        <div class="ai-panel">
          <div class="ai-head">
            <span class="ai-badge">AI Analysis</span>
            <span class="ai-category">${esc(r.ai.category)}</span>
            <span class="ai-confidence">${r.ai.confidencePercent}% confidence</span>
          </div>
          <p class="ai-summary">${esc(r.ai.summary)}</p>
          <p class="ai-root-cause"><strong>Root cause:</strong> ${esc(r.ai.rootCause)}</p>
          ${r.ai.remediationSnippet ? `<pre class="ai-fix">${esc(r.ai.remediationSnippet)}</pre>` : ''}
        </div>`
      : r.aiError
        ? `<div class="ai-panel ai-panel-error">AI analysis unavailable: ${esc(r.aiError)}</div>`
        : '';

    const media = `
      ${r.screenshotDataUri ? `<img class="thumb" src="${r.screenshotDataUri}" alt="Screenshot for ${esc(r.title)}" onclick="this.classList.toggle('zoomed')">` : ''}
      ${r.videoRelPath ? `<video class="video" controls preload="none" src="${esc(r.videoRelPath)}"></video>` : ''}
      ${r.traceRelPath ? `<a class="trace-link" href="${esc(r.traceRelPath)}" download>Download trace.zip</a>` : ''}
    `;

    return `
    <article id="${anchorId}" class="test-card status-${esc(r.status)}" data-search="${esc((r.title + ' ' + r.file + ' ' + r.tags.join(' ')).toLowerCase())}" data-status="${esc(r.status)}">
      <header class="test-card-hdr" onclick="this.parentElement.classList.toggle('open')">
        <span class="badge badge-${esc(r.status)}">${esc(r.status)}</span>
        ${r.testId ? `<span class="tc-id">${esc(r.testId)}</span>` : ''}
        <span class="title">${esc(r.title)}</span>
        ${r.isFlaky ? '<span class="badge badge-flaky">flaky</span>' : ''}
        <span class="duration">${formatDuration(r.durationMs)}</span>
        <span class="proj">${esc(r.project)}</span>
      </header>
      <div class="test-card-body">
        <p class="file-path">${esc(r.file)}${r.retries > 0 ? ` · ${r.retries} retr${r.retries === 1 ? 'y' : 'ies'}` : ''}</p>
        ${r.error ? `<pre class="error">${esc(r.error)}</pre>` : ''}
        ${media}
        ${aiPanel}
        ${r.stack ? `<details class="stack-details"><summary>Stack trace</summary><pre>${esc(r.stack)}</pre></details>` : ''}
      </div>
    </article>`;
  }
}

// Playwright's reporter loader resolves a config array entry like
// `['./reporters/aiHtmlReporter.ts', options]` by instantiating that module's *default*
// export with `options` — keep this alongside the named export so the class works both as a
// direct import (`import { AiHtmlReporter } from '@open-test/playwright-core'`) and as a
// reporter-array module target via a thin local re-export file.
export default AiHtmlReporter;

// Playwright's TestResult.error.message/.stack and stdout/stderr entries carry ANSI SGR
// color/style codes (`ESC[<params>m`, e.g. `\x1b[2m`, `\x1b[31m`) meant for a terminal — left
// in, they render as literal garbage characters in HTML and pollute the text handed to an LLM
// for analysis. Verified against a real captured Playwright error message (confirmed via a
// live test run, not assumed) — matches the exact `ESC[<digits;digits>m` SGR form Playwright
// emits; it does not need the fuller CSI/OSC grammar other terminal output can contain.
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

function esc(value: string | undefined | null): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escId(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '_');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

const STYLES = `
  :root {
    --bg: #0f1117; --panel: #171a23; --border: #262b38; --text: #e5e7eb; --muted: #9aa1b1;
    --pass: #22c55e; --fail: #ef4444; --skip: #a1a1aa; --flake: #f59e0b; --brand: #6366f1;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .hdr { padding: 24px 32px 8px; }
  .hdr h1 { margin: 0 0 4px; font-size: 22px; }
  .meta { color: var(--muted); margin: 0 0 16px; font-size: 13px; }
  .summary { display: flex; gap: 12px; padding: 0 32px 16px; flex-wrap: wrap; }
  .stat { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 20px; min-width: 90px; text-align: center; }
  .stat .n { display: block; font-size: 24px; font-weight: 700; }
  .stat .l { display: block; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  .stat-passed .n { color: var(--pass); } .stat-failed .n { color: var(--fail); }
  .stat-skipped .n { color: var(--skip); } .stat-flaky .n { color: var(--flake); } .stat-rate .n { color: var(--brand); }
  .tabs { display: flex; gap: 4px; padding: 0 32px; border-bottom: 1px solid var(--border); }
  .tab-btn { background: none; border: none; color: var(--muted); padding: 10px 16px; cursor: pointer; font-size: 13px; border-bottom: 2px solid transparent; }
  .tab-btn.active { color: var(--text); border-bottom-color: var(--brand); }
  .tab-panel { padding: 20px 32px 40px; }
  .filters { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
  .filters input[type=text] { background: var(--panel); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 8px; width: 320px; }
  .filters label { color: var(--muted); font-size: 13px; }
  .test-card { background: var(--panel); border: 1px solid var(--border); border-left: 4px solid var(--skip); border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
  .test-card.status-failed, .test-card.status-timedOut { border-left-color: var(--fail); }
  .test-card.status-passed { border-left-color: var(--pass); }
  .test-card.status-skipped { border-left-color: var(--skip); }
  .test-card-hdr { display: flex; align-items: center; gap: 10px; padding: 12px 16px; cursor: pointer; flex-wrap: wrap; }
  .test-card-hdr .title { flex: 1; font-weight: 500; }
  .test-card-hdr .duration, .test-card-hdr .proj { color: var(--muted); font-size: 12px; }
  .tc-id { font-family: ui-monospace, monospace; color: var(--brand); font-size: 12px; }
  .test-card-body { display: none; padding: 0 16px 16px; }
  .test-card.open .test-card-body { display: block; }
  .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .badge-passed { background: rgba(34,197,94,.15); color: var(--pass); }
  .badge-failed, .badge-timedOut { background: rgba(239,68,68,.15); color: var(--fail); }
  .badge-skipped { background: rgba(161,161,170,.15); color: var(--skip); }
  .badge-flaky { background: rgba(245,158,11,.15); color: var(--flake); }
  .tag { background: var(--border); color: var(--muted); border-radius: 6px; padding: 1px 6px; font-size: 11px; margin-right: 4px; }
  .file-path { color: var(--muted); font-size: 12px; margin: 0 0 8px; }
  .error { background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.25); color: #fca5a5; padding: 10px; border-radius: 8px; white-space: pre-wrap; overflow-x: auto; font-size: 12px; }
  .thumb { max-width: 320px; max-height: 200px; border-radius: 8px; border: 1px solid var(--border); cursor: zoom-in; display: block; margin: 10px 0; }
  .thumb.zoomed { max-width: 100%; max-height: none; cursor: zoom-out; }
  .video { max-width: 480px; display: block; margin: 10px 0; border-radius: 8px; }
  .trace-link { display: inline-block; margin: 6px 0; color: var(--brand); font-size: 12px; }
  .ai-panel { background: rgba(99,102,241,.08); border: 1px solid rgba(99,102,241,.3); border-radius: 8px; padding: 12px; margin-top: 10px; }
  .ai-panel-error { color: var(--muted); font-size: 12px; }
  .ai-head { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
  .ai-badge { background: var(--brand); color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; }
  .ai-category { font-family: ui-monospace, monospace; font-size: 12px; color: var(--brand); }
  .ai-confidence { color: var(--muted); font-size: 11px; margin-left: auto; }
  .ai-summary { margin: 6px 0; }
  .ai-fix { background: #0b0d13; padding: 10px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
  .stack-details { margin-top: 8px; }
  .stack-details pre { font-size: 11px; overflow-x: auto; color: var(--muted); }
  .data-table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  .data-table th, .data-table td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 13px; }
  .data-table th { color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 11px; }
  .data-table a { color: var(--brand); text-decoration: none; }
  .empty { color: var(--muted); text-align: center; padding: 20px; }
`;

const SCRIPT = `
  function showTab(name) {
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + name).style.display = '';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
  }
  function applyFilter() {
    var q = document.getElementById('filterInput').value.toLowerCase();
    var failedOnly = document.getElementById('failedOnly').checked;
    document.querySelectorAll('#testList .test-card').forEach(function(card) {
      var matchesText = !q || card.dataset.search.indexOf(q) !== -1;
      var status = card.dataset.status;
      var matchesStatus = !failedOnly || status === 'failed' || status === 'timedOut';
      card.style.display = (matchesText && matchesStatus) ? '' : 'none';
    });
  }
  function jumpTo(link) {
    showTab('tests');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.remove('active');
    var target = document.querySelector(link.getAttribute('href'));
    if (target) { target.classList.add('open'); target.scrollIntoView({behavior:'smooth'}); }
    return false;
  }
`;
