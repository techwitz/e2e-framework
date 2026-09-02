import { test, expect } from '../src/fixtures/lxpTest.js';
import { withData } from '@open-test/playwright-core';
import { z } from 'zod';
import path from 'node:path';

const UserRbacRowSchema = z.object({
  userCode: z.string(),
  email: z.string(),
  role: z.string(),
  targetRoute: z.string(),
  expectedAccess: z.string(),
});

type UserRbacRow = z.infer<typeof UserRbacRowSchema>;

// This spec runs only against the `chromium` project (lxp-app, port 35173) — it has no `@admin`
// tag, so Playwright's project split never runs it against the separate admin app. `/admin/users`
// is not mounted in lxp-app's router at all (confirmed in AppRouter.tsx and
// `resolveWorkspaceAppLandingRoute()` — a WORKSPACE_ADMIN lands at LEARNER_HOME within lxp-app,
// same as any other role), so the dataset's WORKSPACE_ADMIN row targets a real, meaningful
// in-app route instead of a route this project can never reach. The real admin-console access
// boundary (a learner denied `/admin/users` on the actual admin app) is covered for real by
// TC-AUTH-004 in regression/authentication/login-rbac.spec.ts, which runs on `chromium-admin`.
const csvPath = path.resolve(process.cwd(), 'src/data/users/test-users.csv');

test.describe('Data-Driven RBAC Route Access Matrix @ddt @security @rbac', () => {
  withData<UserRbacRow>(csvPath, {}, UserRbacRowSchema).test(
    'Verify route access for role',
    async ({ page, loginAs }, dataRow) => {
      const persona = dataRow.role === 'LEARNER' ? 'learner' : dataRow.role === 'LEARNING_MANAGER' ? 'manager' : 'admin';
      await loginAs(persona, dataRow.targetRoute);
      await page.waitForLoadState('domcontentloaded');

      if (dataRow.expectedAccess === 'ALLOW') {
        await expect(page).not.toHaveURL(/.*(?:unauthorized|error-page)/);
        await expect(page).toHaveURL(new RegExp(dataRow.targetRoute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      } else if (dataRow.expectedAccess === 'DENY') {
        // A denied route must never be the URL the user actually lands on — either
        // the app redirects away (e.g. to login/unauthorized) or blocks navigation.
        const targetRoutePattern = new RegExp(`${dataRow.targetRoute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
        await expect(page).not.toHaveURL(targetRoutePattern);
      } else {
        throw new Error(`[csv-user-rbac] Unknown expectedAccess value in dataset: "${dataRow.expectedAccess}"`);
      }
    },
    test,
  );
});
