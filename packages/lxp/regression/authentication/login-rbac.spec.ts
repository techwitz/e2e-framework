import { test, expect } from '../../src/fixtures/lxpTest.js';
import { Given, When, Then } from '@open-test/playwright-core';
import { LxpMockProvider } from '../../src/mocks/LxpMockProvider.js';
import { createLxpRoleSeed } from '../../src/auth/lxpSessionSeed.js';
import { SessionManager } from '@open-test/playwright-core';

test.describe('Authentication RBAC Matrix @regression @security @rbac', () => {
  // Runs against @bien/app-admin (chromium-admin project). `/host/*` inside lxp-app's own
  // router is just a portal-link catch-all (HostPortalLinkPage) — not a security boundary —
  // so this needs to exercise a route that's actually role-gated: admin's own ProtectedShell.
  test('[TC-AUTH-004] Learner cannot access the tenant admin console @admin', async ({
    loginAs,
    page,
  }) => {
    await Given('a learner (non-admin role) attempts to open the admin user directory', async () => {
      await loginAs('learner', '/#/admin/users');
    });

    await When('the app resolves the role gate for that route', async () => {
      await page.waitForLoadState('domcontentloaded');
    });

    await Then('the platform redirects the learner away from the admin console', async () => {
      await expect(page).not.toHaveURL(/\/admin\/users$/);
    });
  });

  test('[TC-AUTH-005] Session token expiration triggers clean re-auth redirect', async ({
    loginAs,
    page,
  }) => {
    await Given('a learner has an expired session token', async () => {
      await loginAs('learner', '/#/learner/home');
      // Simulate token expiration. A plain `page.evaluate(() => localStorage.removeItem(...))`
      // is not enough here: `loginAs()` seeded this session via `page.addInitScript()`, which
      // Playwright has no API to unregister — it stays permanently registered for this page and
      // re-writes these exact keys on every future reload, silently resurrecting the "expired"
      // session the moment this test reloads below. `SessionManager.clearSession()` handles
      // this for real: it clears the keys now AND registers a later init script that clears
      // them again on every subsequent navigation, so the cleared state actually survives a
      // reload.
      await SessionManager.clearSession(page, ['bien-auth-tenant-lxp', 'bien-auth']);
    });

    await When('the user reloads (the zustand store only re-hydrates from storage on mount, not on client-side nav)', async () => {
      // A plain page.goto() within the same SPA session does NOT re-run persist-hydration —
      // the already-authenticated store stays in memory regardless of what's in storage.
      // A real "session expired" check only happens on a fresh mount, i.e. a real reload.
      await page.goto('/#/learner/my-learning', { waitUntil: 'domcontentloaded' });
      await page.reload({ waitUntil: 'domcontentloaded' });
    });

    await Then('the user is cleanly redirected to login', async () => {
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test('[TC-AUTH-006] Tenant data isolation: User from Tenant A cannot see Tenant B data', async ({
    browser,
  }) => {
    let tenantAWorkspaceHeader: string | undefined;
    let tenantBWorkspaceHeader: string | undefined;
    let tenantAStoredWorkspaceCode: string | undefined;
    let tenantBStoredWorkspaceCode: string | undefined;

    await Given('two users authenticated against two different tenant workspaces', async () => {
      // Tenant A: the DEMO learner persona.
      const contextA = await browser.newContext();
      const pageA = await contextA.newPage();
      await LxpMockProvider.installAllMocks(pageA);
      const seedA = createLxpRoleSeed('LEARNER', 'USR-E2E-LEARNER', 'learner@example.test', 'DEMO');
      await SessionManager.seedSession(pageA, seedA);

      pageA.on('request', (req) => {
        if (/\/(?:api\/)?v1\/learner\/home(?:\?.*)?$/.test(req.url()) && !tenantAWorkspaceHeader) {
          tenantAWorkspaceHeader = req.headers()['x-workspace-id'] ?? req.headers()['authorization'];
        }
      });
      await pageA.goto('/#/learner/home', { waitUntil: 'domcontentloaded' });
      tenantAStoredWorkspaceCode = await pageA.evaluate(() => {
        const raw = window.localStorage.getItem('bien-auth-tenant-lxp');
        return raw ? JSON.parse(raw).state.user.workspaceCode : undefined;
      });
      await contextA.close();

      // Tenant B: the HOST super-admin persona — a genuinely different workspace.
      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      await LxpMockProvider.installAllMocks(pageB);
      const seedB = createLxpRoleSeed('SUPER_ADMIN', 'USR-E2E-HOST', 'hostadmin@example.test', 'HOST');
      await SessionManager.seedSession(pageB, seedB);

      pageB.on('request', (req) => {
        if (/\/(?:api\/)?v1\/learner\/home(?:\?.*)?$/.test(req.url()) && !tenantBWorkspaceHeader) {
          tenantBWorkspaceHeader = req.headers()['x-workspace-id'] ?? req.headers()['authorization'];
        }
      });
      await pageB.goto('/#/learner/home', { waitUntil: 'domcontentloaded' });
      tenantBStoredWorkspaceCode = await pageB.evaluate(() => {
        const raw = window.localStorage.getItem('bien-auth-tenant-lxp');
        return raw ? JSON.parse(raw).state.user.workspaceCode : undefined;
      });
      await contextB.close();
    });

    await Then('each session persists its own distinct tenant workspace, never the other tenant\'s', async () => {
      expect(tenantAStoredWorkspaceCode).toBe('DEMO');
      expect(tenantBStoredWorkspaceCode).toBe('HOST');
      expect(tenantAStoredWorkspaceCode).not.toBe(tenantBStoredWorkspaceCode);
    });

    await Then('each session authenticates outbound API calls with its own tenant credentials', async () => {
      // The two sessions carry distinct synthetic JWTs (encode distinct workspace_id claims),
      // so their outbound Authorization/workspace headers must never be identical either.
      expect(tenantAWorkspaceHeader).toBeTruthy();
      expect(tenantBWorkspaceHeader).toBeTruthy();
      expect(tenantAWorkspaceHeader).not.toBe(tenantBWorkspaceHeader);
    });
  });
});
