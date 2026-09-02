import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const lxpAppPort = process.env.PLAYWRIGHT_PORT ?? '35173';
const lxpAppBaseURL = process.env.BASE_URL ?? `http://127.0.0.1:${lxpAppPort}`;
const adminAppPort = process.env.PLAYWRIGHT_ADMIN_PORT ?? '35174';
const adminAppBaseURL = process.env.ADMIN_BASE_URL ?? `http://127.0.0.1:${adminAppPort}`;

const frontendCwd = path.resolve(process.cwd(), '../../../frontend');

export default defineConfig({
  testDir: './',
  testMatch: [
    'smoke/**/*.spec.ts',
    'regression/**/*.spec.ts',
    'data-driven/**/*.spec.ts',
    'performance/**/*.spec.ts',
    'accessibility/**/*.spec.ts',
    'visual/**/*.spec.ts',
  ],
  // Cold-start Vite dev-server module compilation on the first hit to a given
  // route can comfortably exceed the 30s default test timeout — bump both the
  // per-test timeout and navigation timeout accordingly. On dev-grade hardware running two
  // full Vite dev servers concurrently, observed real page.goto() times reached 45-70s+ even
  // after pre-warming (see plan §3.2.4e) — bumped further here so local/dev runs don't false-fail
  // on environment latency rather than a real defect.
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'block',
    navigationTimeout: 100_000,
    actionTimeout: 20_000,
  },
  // Two independent SPAs are under test: @bien/app-lxp-app (learner/manager surfaces,
  // packages/routes LEARNER_*/MANAGER_* routes) and @bien/app-admin (tenant/host admin
  // surfaces — ROUTES.USERS/SETTINGS/ADMIN_* are only mounted in this app's own router,
  // NOT in lxp-app's — confirmed by grepping frontend/apps/admin/src/routes/AppRouter.tsx).
  // Each needs its own dev server + its own auth storage key (bien-auth-tenant-lxp vs
  // bien-auth-host-admin, see frontend/apps/admin/.env.development).
  webServer: [
    {
      command: `pnpm --filter @bien/app-lxp-app dev --port ${lxpAppPort}`,
      url: lxpAppBaseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: frontendCwd,
      env: {
        ...process.env,
        VITE_AUTH_STORAGE_KEY: 'bien-auth-tenant-lxp',
      },
    },
    {
      command: `pnpm --filter @bien/app-admin dev --port ${adminAppPort}`,
      url: adminAppBaseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: frontendCwd,
      env: {
        ...process.env,
        VITE_AUTH_STORAGE_KEY: 'bien-auth-host-admin',
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      grepInvert: /@admin/,
      use: { ...devices['Desktop Chrome'], baseURL: lxpAppBaseURL },
    },
    {
      name: 'chromium-admin',
      grep: /@admin/,
      use: { ...devices['Desktop Chrome'], baseURL: adminAppBaseURL },
    },
  ],
});
