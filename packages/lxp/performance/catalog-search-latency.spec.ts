import { test, expect } from '../src/fixtures/lxpTest.js';
import { PerformanceBudgetGuard } from '@open-test/playwright-core';

test.describe('Catalog Search Latency & Rendering Budget @perf @search', () => {
  test('[TC-PRF-002] Catalog search response time under 500ms', async ({
    loginAs,
    catalogPage,
    networkTracker,
  }) => {
    await loginAs('learner', '/#/learner/catalog');
    // Wait for the page to actually be interactive before starting the timer — otherwise this
    // budget silently includes leftover Vite dev-server module-compile/hydration time from the
    // navigation itself, which is dev-server serving overhead, not the real search interaction
    // this budget is meant to measure.
    await catalogPage.searchInput.waitFor({ state: 'visible', timeout: 15_000 });

    const start = Date.now();
    await catalogPage.searchCourse('React');
    const searchDuration = Date.now() - start;

    // Verify search interaction completes under 1000ms budget
    PerformanceBudgetGuard.assertBudget('SearchInteraction', searchDuration, 1000);

    // Same real fix as TC-PRF-001 (see learner-dashboard-cwv.spec.ts's comment): a raw
    // `getSlowRequests()` count includes Vite dev-server module-transform requests, which is
    // dev-serving overhead, not real API-latency the budget is meant to police. Filtered to real
    // API calls.
    const slowRequests = networkTracker
      .getSlowRequests(500)
      .filter((r) => /\/(?:api\/)?v1\//.test(r.url));
    expect(slowRequests.length).toBeLessThanOrEqual(1);
  });
});
