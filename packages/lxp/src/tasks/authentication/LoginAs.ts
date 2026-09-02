import { BaseTask, SessionManager } from '@open-test/playwright-core';
import type { Page } from '@playwright/test';
import { LXP_PERSONAS } from '../../config/lxpEnvironments.js';
import { LxpMockProvider } from '../../mocks/LxpMockProvider.js';
import { createLxpRoleSeed } from '../../auth/lxpSessionSeed.js';

export interface LoginAsInput {
  persona: 'learner' | 'manager' | 'admin' | 'instructor' | 'hostAdmin';
  targetPath?: string;
}

export class LoginAsTask extends BaseTask<LoginAsInput, void> {
  async performAs({ persona, targetPath }: LoginAsInput): Promise<void> {
    const creds = LXP_PERSONAS[persona];
    const seed = createLxpRoleSeed(creds.role, creds.userCode, creds.email, creds.workspaceCode);

    await LxpMockProvider.installAllMocks(this.page);
    await SessionManager.seedSession(this.page, seed);

    if (targetPath) {
      // Order matters here. `page.goto()` to a route that only differs by hash (e.g. a second
      // `loginAs()` call in the same test/context, as in DDT specs that switch personas
      // row-to-row) is a same-document navigation in the browser — it does NOT re-execute the
      // page's scripts or re-run zustand's `persist` hydration, so React Router still evaluates
      // the route guard against the PREVIOUSLY-authenticated session still live in memory, which
      // can itself client-side redirect away (e.g. RequireRole bouncing to /learner/home) BEFORE
      // a reload ever runs — reloading afterward would then just reload that wrong, redirected
      // URL instead of the intended target. So: reload FIRST (a real navigation that re-executes
      // init scripts and hydrates the freshly-seeded session for real — a harmless no-op if the
      // page hasn't loaded the app yet), THEN navigate to targetPath once the in-memory session is
      // already correct, so the route guard evaluates the real, current persona.
      await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {
        // reload() on a fresh page that hasn't navigated anywhere yet (e.g. about:blank) can
        // throw in some browser/OS combinations — safe to ignore, the goto() below is a real
        // first navigation regardless and will hydrate correctly on its own.
      });
      await this.page.goto(targetPath, { waitUntil: 'domcontentloaded' });
    }
  }
}
