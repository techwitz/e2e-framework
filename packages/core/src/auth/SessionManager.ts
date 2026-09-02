import type { Page } from '@playwright/test';
import type { AuthStorageSeed } from './types.js';
import { StorageStateProvider } from './StorageStateProvider.js';

/**
 * Thin session-seeding facade over StorageStateProvider. Deliberately has no
 * "build a role's session" convenience method — that requires knowing the
 * consuming app's auth-store shape, which belongs in that app's own domain test
 * package, built as a thin seed-builder layered on top of this primitive.
 */
export class SessionManager {
  static async seedSession<TState>(page: Page, seed: AuthStorageSeed<TState>): Promise<void> {
    await StorageStateProvider.injectSession(page, seed);
  }

  /** Simulates a session disappearing (expiry, sign-out) in a way that survives a later
   * `page.reload()` — see `StorageStateProvider.clearSession()` for why a plain
   * `localStorage.removeItem()` isn't sufficient on its own. */
  static async clearSession(page: Page, storageKeys: string[]): Promise<void> {
    await StorageStateProvider.clearSession(page, storageKeys);
  }
}
