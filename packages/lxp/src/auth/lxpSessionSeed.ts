import { JwtHelper, type AuthStorageSeed } from '@open-test/playwright-core';

/** The Zustand-persisted shape Bien's `bien-auth*` storage keys expect. */
export interface LxpAuthState {
  state: {
    accessToken: string;
    refreshToken: string;
    tokenExpiresAtMs: number;
    user: {
      userCode: string;
      email: string;
      workspaceId: string;
      workspaceCode: string;
      roles: string[];
    };
    apiBaseUrl: string;
    isAuthenticated: boolean;
    rememberMe: boolean;
  };
  version: number;
}

const WELL_KNOWN_LXP_STORAGE_KEYS = ['bien-auth', 'bien-auth-tenant-lxp', 'bien-auth-host-admin'];

/**
 * Builds a Bien LXP-shaped session seed (mirrors the app's Zustand auth-store
 * persistence format) and hands it to the generic `AuthStorageSeed` primitive
 * from `@open-test/playwright-core`.
 */
export function createLxpRoleSeed(
  role: string,
  userCode: string,
  email: string,
  workspaceCode = 'DEMO',
  storageKey = 'bien-auth-tenant-lxp',
): AuthStorageSeed<LxpAuthState> {
  const token = JwtHelper.createSyntheticToken({
    sub: userCode,
    email,
    roles: [role],
    workspace_id: `WS-${workspaceCode}`,
    workspaceCode,
  });

  const storageKeys = Array.from(new Set([storageKey, ...WELL_KNOWN_LXP_STORAGE_KEYS]));

  return {
    storageKeys,
    state: {
      state: {
        accessToken: token,
        refreshToken: `refresh-${token}`,
        tokenExpiresAtMs: Date.now() + 86400 * 30 * 1000,
        user: {
          userCode,
          email,
          workspaceId: `WS-${workspaceCode}`,
          workspaceCode,
          roles: [role],
        },
        apiBaseUrl: '',
        isAuthenticated: true,
        rememberMe: true,
      },
      // Must match the real app's zustand `persist()` version — it doesn't set one
      // explicitly (frontend/packages/auth/src/authStore.ts), which defaults to 0.
      // Any mismatch here makes zustand silently discard the hydrated state (with
      // "couldn't be migrated" logged) and fall back to signed-out defaults.
      version: 0,
    },
  };
}
