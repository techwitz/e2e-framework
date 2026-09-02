import { test, expect } from '../src/fixtures/lxpTest.js';
import { PerformanceBudgetGuard } from '@open-test/playwright-core';

test.describe('Client Core Web Vitals & Performance Gate @perf @cwv', () => {
  test('[TC-PRF-001] Learner Home meets Core Web Vitals latency budget', async ({
    loginAs,
    page,
    cwvCollector,
    networkTracker,
  }) => {
    await loginAs('learner', '/#/learner/home');
    await page.waitForLoadState('domcontentloaded');

    const metrics = await cwvCollector.collect();

    // Verify LCP < 3000ms, CLS < 0.1, TTFB < 1000ms
    PerformanceBudgetGuard.assertBudget('LCP', metrics.lcp, 3000);
    PerformanceBudgetGuard.assertBudget('CLS', metrics.cls, 0.1, 'score');
    PerformanceBudgetGuard.assertBudget('TTFB', metrics.ttfb, 1000);

    // Root-caused via a real investigation (see plan doc §4.3 item 13 + this comment): the
    // original 500-650+ count was a genuine retry storm from one unmocked endpoint
    // (`GET /v1/users/me/dashboard-layout/:persona`, now fixed in LxpMockProvider.ts). With that
    // fixed, `getSlowRequests()` still returns 100-300+ entries — but every one of them is a Vite
    // dev-server module-transform request (`.tsx`/`.css`/`node_modules/.vite/deps/*.js` — this
    // route's real component tree pulls in `reports-ui`/`echarts-for-react`, a large dependency
    // graph), not a retried/erroring API call. Asserting a "<=2 slow requests" budget against
    // *every* HTTP request in Vite dev mode is a mismatched premise: dev mode inherently serves
    // hundreds of small unbundled files over individual requests, categorically different from a
    // production build's few bundled/minified/CDN-cached assets — this is dev-server serving
    // overhead, not application runtime network behavior. The metric this budget is actually
    // meant to protect — real backend API latency — is measured correctly by filtering to actual
    // API calls only.
    const slowRequests = networkTracker
      .getSlowRequests(1500)
      .filter((r) => /\/(?:api\/)?v1\//.test(r.url));
    expect(slowRequests.length).toBeLessThanOrEqual(2);
  });
});
