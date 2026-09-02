# @open-test/playwright-core

Enterprise-grade, product-agnostic testing and performance engineering engine for [Playwright](https://playwright.dev). MIT licensed, zero paid tools, zero vendor lock-in.

This package has **no knowledge of any specific application** — it's the reusable engine. Build
your own domain suite on top of it in your own project (page objects, tasks, mocks, specs) — see
the root [README](../../README.md) for the full pattern and worked examples.

## Install

```bash
npm install --save-dev @open-test/playwright-core @playwright/test
# or: pnpm add -D @open-test/playwright-core @playwright/test
```

## Quickstart

A minimal page object + test, using the engine's `BasePage` and DDT engine:

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

Seeding a pre-authenticated session (skip the login UI in every test) with the generic auth
primitive — `core` doesn't know your app's storage shape, so you build the state object yourself:

```ts
import { SessionManager, JwtHelper, type AuthStorageSeed } from '@open-test/playwright-core';

const token = JwtHelper.createSyntheticToken({ sub: 'user-1', email: 'user@example.com' });
const seed: AuthStorageSeed = {
  storageKeys: ['my-app-auth'], // whatever key(s) your app's client reads from localStorage
  state: { token, isAuthenticated: true },
};
await SessionManager.seedSession(page, seed);
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

## Building your own domain suite on top

The intended pattern is: `core` provides the primitives, your app's own package supplies the
domain knowledge — page objects extending `BasePage`, REST clients extending `BaseApiClient`,
business "tasks" extending `BaseTask`, and your own role-seed helper built on this package's
generic `SessionManager`/`AuthStorageSeed`. See the root [README](../../README.md) for a full
worked example of each piece.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).
