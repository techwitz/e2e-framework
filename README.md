# e2e-framework

**Enterprise Playwright E2E, Data-Driven Testing (DDT), Performance & AI-Powered Testing Framework.**

An opinionated but product-agnostic layer on top of [Playwright](https://playwright.dev) for teams
who want more than raw Playwright out of the box: a Page Object / Task / Factory architecture,
CSV/Excel/JSON-driven data-driven testing, Core Web Vitals & network performance budgets,
axe-core accessibility auditing, visual regression, HAR/PII-redacted failure forensics, optional
AI-assisted failure triage, and a BDD-style `Given`/`When`/`Then` wrapper that doubles as living
documentation. MIT licensed, zero paid tools, zero vendor lock-in.

## Architecture

This is a two-package pnpm workspace:

| Package | Name | What it is |
|---|---|---|
| [`packages/core`](./packages/core) | `@open-test/playwright-core` | **The framework.** Product-agnostic — it has zero knowledge of any specific application. This is what you install and build your own test suite on top of. |
| [`packages/lxp`](./packages/lxp) | `@bien/lxp-e2e` | **A full, real-world example domain suite** built on `packages/core`, testing a real learning-platform application (page objects, tasks, mocks, and ~25 tagged smoke/regression/DDT/performance/accessibility/visual specs). Read it to see the intended pattern in practice — you are not expected to reuse this package directly unless you happen to be testing that exact application. |

The pattern: `core` provides primitives (`BasePage`, `BaseTask`, `BaseApiClient`, `BaseFactory`,
session seeding, data-driven test wrappers, performance/accessibility/visual tooling). Your own
domain package supplies the knowledge specific to *your* app — its pages, its API clients, its
auth-storage shape, its business workflows — exactly the way `packages/lxp` does here.

A CI job in this repo (see [`.github/workflows`](./.github/workflows) if present, or your fork's
equivalent) can enforce that `packages/core` never imports anything from `packages/lxp` or any
other product-specific code — the one hard rule that keeps the framework reusable.

## Requirements

- Node.js >= 20
- [pnpm](https://pnpm.io/) (workspace uses `pnpm-workspace.yaml`)
- A running instance of the application(s) you're testing, reachable over HTTP

## Setup

```bash
git clone https://github.com/techwitz/e2e-framework.git
cd e2e-framework
pnpm install
npx playwright install --with-deps
```

Typecheck everything:

```bash
pnpm typecheck
```

## Using the framework in your own project

You don't need this whole repo — `packages/core` is a standalone, publishable npm package.

```bash
npm install --save-dev @open-test/playwright-core @playwright/test
# or: pnpm add -D @open-test/playwright-core @playwright/test
```

Then build page objects and tests on top of it. A minimal example:

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

See the full quickstart, module reference, and more examples (session seeding, DDT, BDD steps,
performance budgets, accessibility audits) in **[`packages/core`'s own README](./packages/core/README.md)**
— that's the canonical reference for the framework's API.

## Working in this repo (the example suite)

If you're here to read or extend the example domain suite (`packages/lxp`), or to use this repo as
a template for your own two-package layout:

### Configure your target application

Playwright config lives per domain-package (see [`packages/lxp/playwright.config.ts`](./packages/lxp/playwright.config.ts)
for a real, fully-worked example — including a two-app/two-`webServer` setup, per-project tagging,
and environment-driven base URLs). At minimum you'll want:

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

Common environment variables used across this repo's config and fixtures:

| Variable | Purpose | Default (example suite) |
|---|---|---|
| `BASE_URL` | Base URL of the application under test | `http://127.0.0.1:35173` |
| `API_URL` | Base URL of the backend API (if your app proxies/calls one directly in tests) | `http://127.0.0.1:30080` |
| `CI` | Set by CI runners; flips retries/worker-count/report-verbosity to CI-appropriate values | unset locally |
| `E2E_WEBHOOK_URL` | If set, `WebhookNotifier` posts failure/run-summary events here (Slack/Teams-compatible payload) | unset (no-op) |

Your own domain package should keep its real defaults in one small config module (see
[`packages/lxp/src/config/lxpEnvironments.ts`](./packages/lxp/src/config/lxpEnvironments.ts) for the pattern) rather than
scattering `process.env.X ?? 'hardcoded-value'` across specs.

### Writing a test

1. **Page object** — extend `BasePage`, define locators as readonly fields, define user-facing
   actions as async methods (not raw Playwright calls in your spec files). See
   [`packages/lxp/src/pages`](./packages/lxp/src/pages) for ~20 real examples.
2. **Task** (optional) — for a multi-step flow reused across many specs (e.g. "log in as persona
   X and land on route Y"), extend `BaseTask` and wire it into a fixture. See
   [`packages/lxp/src/tasks`](./packages/lxp/src/tasks) and
   [`packages/lxp/src/fixtures/lxpTest.ts`](./packages/lxp/src/fixtures/lxpTest.ts).
3. **Mocks** (optional) — if you want deterministic tests independent of a live backend, install
   `page.route()` interceptors in one place and call that from your fixtures. See
   [`packages/lxp/src/mocks/LxpMockProvider.ts`](./packages/lxp/src/mocks/LxpMockProvider.ts).
4. **Spec file** — use `Given`/`When`/`Then`/`And` from `@open-test/playwright-core` to structure
   the test as readable BDD steps; these are also what the living-documentation generator parses:

```ts
import { test, expect } from '../src/fixtures/myAppTest.js';
import { Given, When, Then } from '@open-test/playwright-core';

test.describe('Checkout @regression @cart', () => {
  test('[TC-CART-001] User can complete checkout with a saved card', async ({ page, loginAs }) => {
    await Given('a returning customer with items in their cart', async () => {
      await loginAs('returningCustomer', '/cart');
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

5. **Tag it.** Tags in the test title (`@smoke`, `@regression`, `@ddt`, `@perf`, `@accessibility`,
   `@visual`) are how the `test:*` scripts below filter what runs. Add your own tags freely —
   they're just `--grep`-matched substrings.

### Data-driven tests (CSV / Excel / JSON)

```ts
import { test } from '../src/fixtures/myAppTest.js';
import { withData } from '@open-test/playwright-core';
import { z } from 'zod';
import path from 'node:path';

const RowSchema = z.object({ email: z.string(), role: z.string(), expectedAccess: z.string() });
type Row = z.infer<typeof RowSchema>;

withData<Row>(path.resolve(process.cwd(), 'src/data/users.csv'), {}, RowSchema).test(
  'Verify access for role',
  async ({ page, loginAs }, row) => {
    // one sub-test per CSV row, run sequentially against the same page
  },
  test,
);
```

CSV, Excel (`.xlsx`, pass `{ sheetName }`), and JSON are all supported via the same `withData()`
API — see [`packages/core/src/data-driven`](./packages/core/src/data-driven).

### Running tests

From a domain package directory (e.g. `packages/lxp`):

```bash
pnpm test              # everything
pnpm test:smoke        # @smoke only — fast availability gate
pnpm test:regression   # @regression only
pnpm test:ddt          # @ddt only
pnpm test:perf         # @perf only — Core Web Vitals & network budgets
pnpm test:a11y         # @accessibility only — axe-core WCAG audit
pnpm test:visual       # @visual only — screenshot regression
```

Or target a specific file/line directly with the Playwright CLI: `npx playwright test path/to.spec.ts:42`.

### Generating living documentation

`packages/core`'s BDD parser can turn your `Given`/`When`/`Then` specs into a Markdown spec
catalog — useful as executable, always-up-to-date documentation for stakeholders who don't read
code:

```bash
pnpm --dir packages/core generate:living-docs
# or, fully explicit:
npx tsx packages/core/src/bdd-living-docs/cli.ts <specDir> <outputPath> --title="My Project"
```

### Performance budgets & accessibility

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

### Seeding an authenticated session (skip the login UI)

`core` doesn't know your app's storage shape — you describe it once, `core` handles writing it
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
`SessionManager.clearSession(page, storageKeys)` rather than a plain
`localStorage.removeItem()` — `seedSession()`'s write happens via a permanent `page.addInitScript()`
that Playwright has no API to unregister, so a bare removal gets silently re-written on the very
next reload. `clearSession()` handles this correctly (see `packages/core/src/auth/StorageStateProvider.ts`).

## CI

Wire up whatever CI system you use to run, at minimum:

```bash
pnpm --dir packages/core typecheck
pnpm --dir packages/lxp typecheck   # or your own domain package
pnpm --dir packages/lxp test:smoke  # fast gate on every PR
```

Run `test:regression`/`test:ddt`/`test:a11y`/`test:perf`/`test:visual` on a schedule or on merge
to your main branch — they're slower and (for the perf/DDT suites especially) more sensitive to
host resource contention, so they're better suited to a nightly job than a per-PR gate.

## Package docs

- [`packages/core` README](./packages/core/README.md) — the canonical framework reference: install,
  quickstart, and a full module-by-module breakdown
- [`packages/core` CONTRIBUTING](./packages/core/CONTRIBUTING.md) — the one hard rule (no
  product-specific coupling in `core`) plus the self-check command

## License

MIT — see [`packages/core/LICENSE`](./packages/core/LICENSE). `packages/lxp` is provided as a
reference example under the same terms.
