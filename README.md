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
| `config/` | `ConfigLoader`/`EnvConfig` — env-var-driven configuration with generic defaults |
| `data-driven/` | CSV/Excel/JSON data providers + `zod`-validated `withData()` test wrapper |
| `forensics/` | `HarRecorder`, `DiagnosticBundle`, `TelemetryCollector`, `PiiRedactor` — failure artifact capture with PII redaction before anything leaves the machine |
| `ai-insights/` | Pluggable AI root-cause analysis (`AiFailureAnalyzer`) with Gemini/OpenAI/Claude/local-Ollama provider adapters |
| `bdd-living-docs/` | `Given`/`When`/`Then` wrappers + a CLI that generates a living Markdown spec catalog from your specs |
| `performance/` | Core Web Vitals collection, network timing, a performance-budget guard, and a k6 load-script generator |
| `accessibility/` | Axe-core-powered WCAG 2.1 AA auditor |
| `visual/` | Masked visual-regression snapshot matching |
| `reporting/` | Structured logging, flaky-test quarantine tracking, Slack/Teams webhook notifications |

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
