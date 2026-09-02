import type { Page } from '@playwright/test';
import * as adminApiMocks from '../../../../../frontend/apps/admin/e2e/adminApiMocks.js';
import * as reportApiMocks from '../../../../../frontend/apps/admin/e2e/reportApiMocks.js';
import * as taxonomyApiMocks from '../../../../../frontend/apps/admin/e2e/taxonomyApiMocks.js';
import * as tenantApiMocks from '../../../../../frontend/apps/admin/e2e/tenantApiMocks.js';

/**
 * Re-exports the existing, battle-tested Playwright mock fixtures from the
 * frontend app's own e2e suites, so `LxpMockProvider` can reuse them instead of
 * re-implementing route mocking from scratch. Isolates the cross-repo relative
 * paths — and the one necessary type cast — to this one file.
 *
 * `tests/` and `frontend/` are intentionally separate pnpm workspaces with
 * independent lockfiles (see docs/test-architecture.md's OSS-publishability
 * goals — `tests/packages/core` must stay free of product coupling). Each
 * resolves its own copy of `@playwright/test`, and those copies land on
 * slightly different patch versions (currently 1.62.x here vs 1.60.x in
 * `frontend/`), so TS sees two structurally-similar-but-not-identical `Page`
 * types across the workspace boundary. The functions below are runtime-
 * identical regardless (same Playwright route-mocking API); the cast just
 * satisfies the compiler at the one seam where two independent `Page` types
 * meet, isolated here instead of `as any` scattered through call sites.
 *
 * Only mock files with NO `@bien/*` workspace-package imports are re-exported
 * here. Left un-reused for now (tracked as a follow-up, not silently dropped):
 * - `lxpApiMocks.ts` (needs `@bien/api-client`, which itself needs
 *   `@bien/crypto`) — community/gamification/executive/instructor/manager
 *   persona mocks, login flow mocks, exit-gate mocks.
 * - `hostApiMocks.ts` (needs `@bien/api-client`) — host-level workspace
 *   rate-limits/consumption/provider-catalog mocks.
 * - `reportEngineMocks.ts` (needs `@bien/dashboard/reports-adapter`, which
 *   itself needs `@bien/auth`/`@bien/i18n`/`@bien/ui`) — report-engine widget
 *   mocks.
 * `LxpMockProvider` still covers the domains those files would have added, via
 * its own hand-rolled routes, until one of these is resolved:
 *   (a) the frontend packages ship prebuilt, dependency-free bundles usable
 *       outside their own workspace, or
 *   (b) `tests/` accepts joining `frontend/`'s pnpm workspace (trades away the
 *       "framework has zero product coupling" goal for full mock reuse).
 */
export async function installTenantDashboardMocks(page: Page): Promise<void> {
  await adminApiMocks.installTenantDashboardMocks(page as any);
}

export async function installProviderCatalogMocks(page: Page): Promise<void> {
  await adminApiMocks.installProviderCatalogMocks(page as any);
}

export async function installReportApiMocks(page: Page): Promise<void> {
  await reportApiMocks.installReportApiMocks(page as any);
}

export async function installTaxonomyApiMocks(page: Page): Promise<void> {
  await taxonomyApiMocks.installTaxonomyApiMocks(page as any);
}

export async function installTenantExecutiveApiMocks(page: Page): Promise<void> {
  await tenantApiMocks.installTenantExecutiveApiMocks(page as any);
}
