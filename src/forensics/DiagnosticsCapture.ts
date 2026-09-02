import type { Page, TestInfo } from '@playwright/test';

export type BreadcrumbType = 'console' | 'pageerror' | 'request-failed' | 'response-error';

export interface Breadcrumb {
  type: BreadcrumbType;
  timestamp: string;
  detail: string;
}

export interface FailureDiagnostics {
  urlAtFailure?: string;
  breadcrumbs: Breadcrumb[];
}

const MAX_BREADCRUMBS = 50;
export const DIAGNOSTICS_ATTACHMENT_NAME = 'diagnostics';

/**
 * Records a rolling breadcrumb trail (console errors/warnings, uncaught page errors, failed
 * requests, and 4xx/5xx responses) for the lifetime of a test, and — only when the test did not
 * pass — attaches it, plus the page's URL at that point, as a JSON `testInfo.attach()` so a
 * Reporter (which has no live `Page` reference of its own; the Reporter API only sees
 * `TestResult.attachments`) can surface it. Nothing is attached for a passing test — no reason
 * to bloat every report with breadcrumbs nobody needs to read.
 */
export async function captureFailureDiagnostics(
  page: Page,
  testInfo: TestInfo,
  run: () => Promise<void>,
): Promise<void> {
  const breadcrumbs: Breadcrumb[] = [];
  const push = (entry: Breadcrumb) => {
    breadcrumbs.push(entry);
    if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();
  };

  const onConsole = (msg: { type(): string; text(): string }) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      push({ type: 'console', timestamp: new Date().toISOString(), detail: `[${type}] ${msg.text()}` });
    }
  };
  const onPageError = (err: Error) => {
    push({ type: 'pageerror', timestamp: new Date().toISOString(), detail: err.message });
  };
  const onRequestFailed = (req: { method(): string; url(): string; failure(): { errorText: string } | null }) => {
    push({
      type: 'request-failed',
      timestamp: new Date().toISOString(),
      detail: `${req.method()} ${req.url()} — ${req.failure()?.errorText ?? 'failed'}`,
    });
  };
  const onResponse = (res: { status(): number; url(): string; request(): { method(): string } }) => {
    if (res.status() >= 400) {
      push({
        type: 'response-error',
        timestamp: new Date().toISOString(),
        detail: `${res.request().method()} ${res.url()} → ${res.status()}`,
      });
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  try {
    await run();
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);

    if (testInfo.status !== 'passed' && testInfo.status !== 'skipped') {
      const diagnostics: FailureDiagnostics = {
        urlAtFailure: page.isClosed() ? undefined : (() => {
          try {
            return page.url();
          } catch {
            return undefined;
          }
        })(),
        breadcrumbs,
      };
      await testInfo.attach(DIAGNOSTICS_ATTACHMENT_NAME, {
        body: JSON.stringify(diagnostics, null, 2),
        contentType: 'application/json',
      });
    }
  }
}
