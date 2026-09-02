import type { Page } from '@playwright/test';
import type { AuthStorageSeed } from './types.js';

export class StorageStateProvider {
  /**
   * Writes `seed.state` (JSON-serialized) into every key listed in `seed.storageKeys`,
   * via an init script so it's present before the app's first script runs. Writes to
   * exactly the keys given — no implicit/product-specific keys.
   *
   * Note: `page.addInitScript()` scripts are permanent for the page's lifetime — Playwright
   * has no API to remove one once registered. That means this seed script re-fires (and
   * re-writes these exact keys) on every future navigation/reload of this page, including
   * ones a test triggers well after this call returns. For a test that seeds a session once
   * and never needs to simulate that session disappearing, this is harmless and desired
   * (it's what makes navigation-heavy specs keep working). For a test that DOES need to
   * simulate an expired/cleared session and then reload, call `clearSession()` — it
   * neutralizes this seed script going forward without needing to remove it.
   */
  static async injectSession<TState>(page: Page, seed: AuthStorageSeed<TState>): Promise<void> {
    const raw = JSON.stringify(seed.state);

    await page.addInitScript(
      ({ storageKeys, serializedState }) => {
        try {
          for (const key of storageKeys) {
            window.localStorage.setItem(key, serializedState);
          }
        } catch {
          // ignore init script error
        }
      },
      { storageKeys: seed.storageKeys, serializedState: raw },
    );
  }

  /**
   * Simulates a session disappearing (expiry, manual sign-out, storage cleared by another
   * tab) in a way that survives a subsequent `page.reload()`. Removing the keys via
   * `page.evaluate()` alone is not enough: any earlier `injectSession()` call already
   * registered a permanent init script that re-writes those same keys on the very next
   * reload/navigation (Playwright provides no way to unregister it). This method both clears
   * the keys immediately on the current document AND registers a new init script — which,
   * because init scripts run in registration order, runs AFTER every earlier seed script on
   * each future navigation and deletes the keys again — so the session stays gone for real,
   * not just until the next reload.
   */
  static async clearSession(page: Page, storageKeys: string[]): Promise<void> {
    await page.evaluate((keys) => {
      for (const key of keys) {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      }
    }, storageKeys);

    await page.addInitScript((keys) => {
      try {
        for (const key of keys) {
          window.localStorage.removeItem(key);
          window.sessionStorage.removeItem(key);
        }
      } catch {
        // ignore init script error
      }
    }, storageKeys);
  }
}
