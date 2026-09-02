# @open-test/playwright-core

**Enterprise Playwright E2E, Data-Driven Testing (DDT), Performance & AI-Powered Testing Framework.**

A product-agnostic layer on top of [Playwright](https://playwright.dev) for teams who want more
than raw Playwright out of the box: a Page Object / Task / Factory architecture, CSV/Excel/JSON-
driven data-driven testing, Core Web Vitals & network performance budgets, axe-core accessibility
auditing, visual regression, HAR/PII-redacted failure forensics, optional AI-assisted failure
triage, and a BDD-style `Given`/`When`/`Then` wrapper that doubles as living documentation. MIT
licensed, zero paid tools, zero vendor lock-in.

This package has **no knowledge of any specific application** — it's the reusable engine. You
install it and build your own domain-specific test suite (page objects, tasks, mocks, specs) in
your own project, the same way you'd build on top of any other test framework.

## Requirements

- Node.js >= 20
- [pnpm](https://pnpm.io/), npm, or yarn
- A running instance of the application you're testing, reachable over HTTP

## Install

```bash
npm install --save-dev @open-test/playwright-core @playwright/test
# or: pnpm add -D @open-test/playwright-core @playwright/test
npx playwright install --with-deps
```

## Quickstart

A minimal page object + test, using `BasePage`:

```ts
// pages/LoginPage.ts
import { BasePage } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page, '/login');
  }

  readonly emailInput = this.page.getByLabel(/email/i);
  readonly passwordInput = this.page.getByLabel(/password/i);
  readonly signInButton = this.page.getByRole('button', { name: /sign in/i });

  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.signInButton);
  }
}
```

```ts
// login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test('user can log in', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.login('user@example.com', 'password123');
  await expect(page).toHaveURL(/dashboard/);
});
```

## AI-powered HTML report

Screenshots, videos, and traces sitting in separate `test-results/` folders don't help a
developer or a QA engineer understand *why* something broke — they have to hunt for the right
file, cross-reference it against a test ID, then read a raw stack trace themselves. `AiHtmlReporter`
assembles everything the framework already captures into one self-contained dashboard, and —
opt-in, using your own LLM API key — adds a root-cause summary and suggested fix per failure.

![Dashboard: pass/fail counts, pass rate, and a filterable/searchable test list](./docs/screenshots/dashboard.png)

Click any test to expand it in place — real screenshot thumbnail, embedded video player, a
downloadable trace, the full (ANSI-stripped, PII-redacted) error and stack trace, the **page URL
at the moment of failure**, and a color-coded **breadcrumb trail** (console errors/warnings,
uncaught page errors, failed requests, and 4xx/5xx responses in the run-up to the failure) — plus
a one-click **Copy details** button that puts a plain-text summary of all of it on your clipboard,
ready to paste into a bug report or a chat message:

![Expanded failed-test card with screenshot, video player, page URL, breadcrumb trail, and a copy-details button](./docs/screenshots/failed-test-detail.png)

The page URL and breadcrumb trail come from `captureFailureDiagnostics()` — wire it in as an
auto-fixture and it silently attaches this data to any non-passing test, with nothing to opt into
per test:

```ts
// fixtures.ts
import { test as base } from '@playwright/test';
import { captureFailureDiagnostics } from '@open-test/playwright-core';

export const test = base.extend<{ _diagnosticsCapture: void }>({
  _diagnosticsCapture: [
    async ({ page }, use, testInfo) => {
      await captureFailureDiagnostics(page, testInfo, async () => { await use(); });
    },
    { auto: true },
  ],
});
```

A **Traceability** tab turns the `[TC-XXX-001]` convention already used throughout your specs
into a live matrix — test ID, title, source file, tags, and pass/fail status, all in one sortable
table (each row deep-links back to that test's card):

![Traceability matrix mapping test IDs to titles, files, tags, and status](./docs/screenshots/traceability.png)

A third **Flaky History** tab shows tests that only passed after a retry, persisted across runs
(not just the current one) via `FlakyQuarantineManager`, with tests crossing a configurable
retry threshold flagged for quarantine. A fourth **Performance** tab lists the slowest tests in
the run and, when AI analysis is enabled, groups failures by AI-assigned category — a lightweight
form of failure clustering: five failures all tagged `[LOCATOR_DRIFT]` usually share one root
cause, not five separate ones.

A `summary.json` is written alongside `index.html` on every run — total/passed/failed/skipped/
flaky counts, pass rate, the slowest tests, and the failed-tests list with AI category/root-cause
where available — for any other tool (a CI badge, a dashboard, a bot) that wants the numbers
without parsing HTML.

### Slack / Microsoft Teams notifications

Also opt-in, also off by default:

```ts
[
  './reporters/aiHtmlReporter.ts',
  {
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL,
    reportUrl: process.env.AI_REPORT_URL, // link back to wherever your CI uploads the report
    notifyOnFailureOnly: true, // default false — post every run, pass or fail
  },
]
```

Posts a run summary (counts, pass rate, duration, and up to 10 failing tests with their AI
category if analysis was enabled) once the report is written. A webhook failure is logged and
swallowed — it can never fail your test run or hide the real pass/fail result.

### Optional quality gate

```ts
{ minPassRatePercent: 95 }
```

If set, `process.exitCode` is set to `1` when the run's pass rate falls below this threshold —
independent of, and in addition to, Playwright's own exit code. Useful for a gate that should
reject a build on "too many failures" even when the individual failures alone wouldn't otherwise
be configured to fail CI. Omitted by default — this reporter never changes your exit code unless
you opt in.

### Wiring it in

```ts
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['list'],
    ['html'],
    [
      '@open-test/playwright-core/dist/reporting/AiHtmlReporter.js',
      {
        outputDir: 'ai-html-report',
        projectTitle: 'My App — Test Execution Report',
        // Opt-in only — omit this line entirely and the report still generates in full
        // (thumbnails, video, traceability, flaky history), just without the AI panel. No
        // LLM call happens unless this is set.
        aiProvider: process.env.AI_REPORT_PROVIDER, // 'gemini' | 'openai' | 'claude' | 'ollama'
      },
    ],
  ],
});
```

If your bundler/runtime can't resolve a package subpath directly (this repo's own example suite
hits exactly that, since it consumes `core` via pnpm's `workspace:*` protocol against source, not
a built `dist/`), add one small local file instead and point the reporter array at that:

```ts
// reporters/aiHtmlReporter.ts
import { AiHtmlReporter } from '@open-test/playwright-core';
export default AiHtmlReporter;
```

```ts
// playwright.config.ts
reporter: [['list'], ['./reporters/aiHtmlReporter.ts', { aiProvider: process.env.AI_REPORT_PROVIDER }]]
```

### What "AI-powered" actually means here

- **Optional, not mandatory — because AI calls cost real money.** `AiFailureAnalyzer`'s own
  default provider is `'none'`, which resolves to a `NoOpProvider` that throws loudly if
  `analyze()` is ever called on it — there is no hidden fallback to a real provider if you forget
  to set one. No API call happens unless `aiProvider` is explicitly set (or the
  `AI_REPORT_PROVIDER` env var is). A report with `aiProvider` unset is still the full dashboard
  above — traceability, thumbnails, video, flaky history, performance — just without the AI panel.
- **Bring your own key — and your own env var name.** `AiFailureAnalyzer` already supports Gemini,
  OpenAI, Claude, and a fully local Ollama provider (zero external calls, zero cost) — see
  [`ai-insights/`](./src/ai-insights). The framework itself never reads `GEMINI_API_KEY`/
  `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`/`OLLAMA_HOST` or any other AI-vendor env var (or secrets
  file) — that's your application's decision, not the framework's. Resolve the credential however
  your app already does (an env var, a secrets manager, a `.env` file) and pass the resolved value
  through `aiApiKey` (and `aiOllamaHost`/`aiOllamaModel` for Ollama):
  ```ts
  [
    './reporters/aiHtmlReporter.ts',
    {
      aiProvider: process.env.AI_REPORT_PROVIDER,
      aiApiKey:
        process.env.AI_REPORT_PROVIDER === 'claude' ? process.env.ANTHROPIC_API_KEY :
        process.env.AI_REPORT_PROVIDER === 'gemini' ? process.env.GEMINI_API_KEY :
        process.env.AI_REPORT_PROVIDER === 'openai' ? process.env.OPENAI_API_KEY :
        undefined,
    },
  ]
  ```
- **Redacted before it leaves the process.** Console logs, error messages, and stack traces are
  passed through `PiiRedactor` before being sent to any provider — see
  [`forensics/PiiRedactor.ts`](./src/forensics/PiiRedactor.ts).
- **Never blocks or fails your suite.** If the analysis call errors (bad key, rate limit, network),
  the reporter catches it and shows "AI analysis unavailable" in that test's card — it never turns
  a real test failure into a reporter failure.
- **Per-failure structured output**, not a free-text chat response: a category (`[PRODUCT_BUG]`,
  `[LOCATOR_DRIFT]`, `[ENVIRONMENT_TIMEOUT]`, `[API_REGRESSION]`, `[TEST_DATA_MISMATCH]`, or
  `[UNKNOWN_FAILURE]`), a confidence percentage, a root-cause explanation, and — where the model
  can infer one — a suggested code fix. See [`ai-insights/types.ts`](./src/ai-insights/types.ts).

## Configuring your target application

This package doesn't ship a `playwright.config.ts` — that lives in your own project, same as
with vanilla Playwright:

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:3000',
  },
  webServer: {
    command: 'pnpm dev',
    url: process.env.BASE_URL ?? 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

Keep your app's own real defaults (base URL, API URL, persona credentials, etc.) in one small
config module rather than scattering `process.env.X ?? 'hardcoded-value'` across specs —
`ConfigLoader` (below) gives you an env-var-driven starting point.

## Cross-browser & responsive/mobile testing

`expandProjectsAcrossDevices()` turns a small set of "real" Playwright projects (one per app,
base URL, or tag filter you actually need) into the full cross-browser + device matrix, without
hand-duplicating every project definition — and without slowing down your default local run,
since nothing is expanded unless you ask for it:

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import { expandProjectsAcrossDevices, type BrowserEngine } from '@open-test/playwright-core';

const extraBrowsers = (process.env.E2E_BROWSERS ?? '').split(',').filter(Boolean) as BrowserEngine[];
const extraDevices = (process.env.E2E_DEVICES ?? '').split(',').filter(Boolean);

export default defineConfig({
  projects: expandProjectsAcrossDevices(
    [{ name: 'chromium', use: { ...devices['Desktop Chrome'], baseURL: process.env.BASE_URL } }],
    { browsers: extraBrowsers, devices: extraDevices },
  ),
});
```

- **`playwright test`** — just the base project(s) you defined, exactly like today. Nothing
  changes unless you set an env var.
- **`E2E_BROWSERS=firefox,webkit playwright test`** — every base project also runs on Firefox and
  WebKit (`chromium-firefox`, `chromium-webkit`, …).
- **`E2E_DEVICES="iPhone 14,Pixel 7" playwright test`** — every base project also runs against
  those emulated devices (`chromium-iphone-14`, `chromium-pixel-7`, …) — any device name from
  Playwright's own `devices` export works.
- **`playwright test --project=chromium-webkit`** (or any other generated project name) — target
  one specific browser/device directly, using Playwright's own `--project` flag.

Mix both env vars to get the full grid in one run. A base project's own `grep`/`grepInvert`/
`testMatch`/etc. carry through to every generated variant, so per-app tag filtering (like the
admin-vs-learner split in this repo's own example suite) keeps working across the whole matrix.

## Building your own test suite on top

The intended pattern: `core` provides the primitives, your app's own package supplies the domain
knowledge — page objects extending `BasePage`, REST clients extending `BaseApiClient`, business
"tasks" extending `BaseTask`, and your own role-seed helper built on this package's generic
`SessionManager`/`AuthStorageSeed`.

### 1. Page objects

Extend `BasePage`. Locators as readonly fields, user-facing actions as async methods — keep raw
Playwright calls out of your spec files.

```ts
export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page, '/dashboard');
  }
  readonly welcomeBanner = this.page.getByRole('heading', { name: /welcome/i });
}
```

### 2. Tasks (optional)

For a multi-step flow reused across many specs (e.g. "log in as role X and land on route Y"),
extend `BaseTask` and wire it into a Playwright fixture:

```ts
import { BaseTask } from '@open-test/playwright-core';

export interface LoginAsInput { role: 'admin' | 'user'; targetPath?: string }

export class LoginAsTask extends BaseTask<LoginAsInput, void> {
  async performAs({ role, targetPath }: LoginAsInput): Promise<void> {
    // seed a session (see "Seeding an authenticated session" below), then navigate
  }
}
```

```ts
// fixtures/myAppTest.ts
import { test as base } from '@playwright/test';
import { LoginAsTask } from '../tasks/LoginAsTask';

export const test = base.extend<{ loginAs: (role: 'admin' | 'user', path?: string) => Promise<void> }>({
  loginAs: async ({ page }, use) => {
    const task = new LoginAsTask(page);
    await use((role, targetPath) => task.performAs({ role, targetPath }));
  },
});
export { expect } from '@playwright/test';
```

### 3. Mocks (optional)

If you want deterministic tests independent of a live backend, install `page.route()`
interceptors in one place and call that from your fixtures — one function your whole suite reuses,
not ad-hoc mocking scattered across specs.

### 4. Spec files — BDD-style steps

Use `Given`/`When`/`Then`/`And` to structure the test as readable steps; these are also what the
living-documentation generator (below) parses into a spec catalog:

```ts
import { test, expect } from '../fixtures/myAppTest.js';
import { Given, When, Then } from '@open-test/playwright-core';

test.describe('Checkout @regression @cart', () => {
  test('[TC-CART-001] User can complete checkout with a saved card', async ({ page, loginAs }) => {
    await Given('a returning customer with items in their cart', async () => {
      await loginAs('user', '/cart');
    });

    await When('they submit checkout with their saved payment method', async () => {
      // ...
    });

    await Then('they land on the order confirmation page', async () => {
      await expect(page).toHaveURL(/order-confirmation/);
    });
  });
});
```

### 5. Tag your tests

Tags in the test title (e.g. `@smoke`, `@regression`, `@ddt`, `@perf`, `@accessibility`,
`@visual`) are just substrings `playwright test --grep` matches — invent whatever tag vocabulary
fits your project and wire matching `npm`/`pnpm` scripts to them (`"test:smoke": "playwright test
--grep @smoke"`, etc.).

## Data-driven tests (CSV / Excel / JSON)

```ts
import { test } from '../fixtures/myAppTest.js';
import { withData } from '@open-test/playwright-core';
import { z } from 'zod';
import path from 'node:path';

const RowSchema = z.object({ email: z.string(), role: z.string(), expectedAccess: z.string() });
type Row = z.infer<typeof RowSchema>;

withData<Row>(path.resolve(process.cwd(), 'data/users.csv'), {}, RowSchema).test(
  'Verify access for role',
  async ({ page, loginAs }, row) => {
    // one sub-test per row, run sequentially against the same page
  },
  test,
);
```

CSV, Excel (`.xlsx` — pass `{ sheetName }`), and JSON are all supported via the same `withData()`
API — see [`src/data-driven`](./src/data-driven).

## Performance budgets & accessibility

```ts
import { PerformanceBudgetGuard, CoreWebVitalsCollector } from '@open-test/playwright-core';

const metrics = await cwvCollector.collect();
PerformanceBudgetGuard.assertBudget('LCP', metrics.lcp, 3000);
```

```ts
import { A11yAuditor } from '@open-test/playwright-core';

const violations = await A11yAuditor.audit(page, { tags: ['wcag2a', 'wcag2aa'] });
expect(violations).toHaveLength(0);
```

## Seeding an authenticated session (skip the login UI)

The framework doesn't know your app's storage shape — you describe it once, it handles writing it
before the page's first script runs:

```ts
import { SessionManager, JwtHelper, type AuthStorageSeed } from '@open-test/playwright-core';

const token = JwtHelper.createSyntheticToken({ sub: 'user-1', email: 'user@example.com' });
const seed: AuthStorageSeed = {
  storageKeys: ['my-app-auth'], // whatever localStorage key(s) your app's client reads
  state: { token, isAuthenticated: true },
};
await SessionManager.seedSession(page, seed);
```

If a later test needs to simulate that session expiring/being cleared and reloading, use
`SessionManager.clearSession(page, storageKeys)` rather than a plain `localStorage.removeItem()`
— `seedSession()`'s write happens via a permanent `page.addInitScript()` that Playwright has no
API to unregister, so a bare removal gets silently re-written on the very next reload.
`clearSession()` handles this correctly — see
[`src/auth/StorageStateProvider.ts`](./src/auth/StorageStateProvider.ts).

## Generating living documentation

The BDD parser can turn your `Given`/`When`/`Then` specs into a Markdown spec catalog — useful as
executable, always-up-to-date documentation for stakeholders who don't read code:

```bash
npx tsx node_modules/@open-test/playwright-core/src/bdd-living-docs/cli.ts <specDir> <outputPath> --title="My Project"
```

Or, if you've cloned this repo directly to work on the framework itself:

```bash
pnpm generate:living-docs
```

## What's in here

| Module | What it does |
|---|---|
| `base/` | `BasePage`, `BaseComponent`, `BaseTask`, `BaseApiClient`, `BaseFactory` — the abstract classes everything else builds on |
| `auth/` | Generic session seeding (`SessionManager`, `StorageStateProvider`, `JwtHelper`) — no product-specific storage keys or state shape |
| `config/` | `ConfigLoader`/`EnvConfig` — env-var-driven configuration with generic defaults; `expandProjectsAcrossDevices` for opt-in cross-browser/responsive-device project matrices |
| `data-driven/` | CSV/Excel/JSON data providers + `zod`-validated `withData()` test wrapper |
| `forensics/` | `HarRecorder`, `DiagnosticBundle`, `TelemetryCollector`, `PiiRedactor`, `captureFailureDiagnostics` (page URL + console/network breadcrumb trail on failure) — failure artifact capture with PII redaction before anything leaves the machine |
| `ai-insights/` | Pluggable AI root-cause analysis (`AiFailureAnalyzer`) with Gemini/OpenAI/Claude/local-Ollama provider adapters, defaulting to a real no-op provider — analysis is opt-in, never automatic, and the framework never reads an AI-vendor env var itself; you pass the resolved credential in |
| `bdd-living-docs/` | `Given`/`When`/`Then` wrappers + a CLI that generates a living Markdown spec catalog from your specs |
| `performance/` | Core Web Vitals collection, network timing, a performance-budget guard, and a k6 load-script generator |
| `accessibility/` | Axe-core-powered WCAG 2.1 AA auditor |
| `visual/` | Masked visual-regression snapshot matching |
| `reporting/` | `AiHtmlReporter` — the comprehensive HTML dashboard described above; structured logging; persistent flaky-test tracking (`FlakyQuarantineManager`); Slack/Teams webhook notifications |

## Working on the framework itself

```bash
git clone https://github.com/techwitz/e2e-framework.git
cd e2e-framework
pnpm install
pnpm typecheck
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) — the no-product-coupling rule plus the self-check
command.

## License

MIT — see [LICENSE](./LICENSE).
