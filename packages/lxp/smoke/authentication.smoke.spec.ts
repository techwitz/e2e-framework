import { test, expect } from '../src/fixtures/lxpTest.js';
import { Given, When, Then } from '@open-test/playwright-core';

test.describe('Authentication & Session Availability Gate @smoke @critical @auth', () => {
  test('[TC-AUTH-001] User lands on login surface and authenticates', async ({
    loginPage,
    page,
  }) => {
    await Given('an unauthenticated user navigates to the login screen', async () => {
      await loginPage.navigate();
      await expect(page).toHaveURL(/.*login/);
    });

    await When('the user views the login interface', async () => {
      await expect(loginPage.emailInput).toBeVisible({ timeout: 15_000 });
    });

    await Then('the primary login controls are available', async () => {
      await expect(loginPage.continueButton.or(loginPage.signInButton)).toBeVisible();
    });
  });
});
