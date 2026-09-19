import { defineConfig, type PlaywrightTestConfig, type Project } from '@playwright/test';

import { ConfigLoader } from './ConfigLoader.js';
import { expandProjectsAcrossDevices, type BaseProjectDefinition, type BrowserEngine } from './DeviceMatrix.js';

/** Flags resolved from the environment for `definePlaywrightConfig`'s `webServer`/`use.baseURL`
 * defaults. Consumers read this directly when they need the same resolved baseUrl outside of a
 * `definePlaywrightConfig` call (e.g. a vite dev-server port comment cross-referencing it). */
export interface ParsedFlags {
  baseUrl: string;
  isCI: boolean;
}

/**
 * Resolves the baseUrl a `definePlaywrightConfig` run will target: `PLAYWRIGHT_BASE_URL` (or
 * `BASE_URL`) if set, else `http://127.0.0.1:30100` — the framework's conventional local port for
 * a consumer's own dev/preview server, chosen so a consumer's harness/dev app can bind that exact
 * port and never need to set an override for local or CI runs.
 */
export function parseFlags(): ParsedFlags {
  return {
    baseUrl: process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:30100',
    isCI: Boolean(process.env.CI),
  };
}

export interface DefinePlaywrightConfigOptions extends Omit<PlaywrightTestConfig, 'webServer'> {
  /** Short uppercase tag prefixed onto this suite's HTML report title (e.g. 'BIENUI'). */
  prefix: string;
  /** Command used to boot the consumer's app before the suite runs, e.g. `npm run start`.
   * Defaults to `npm run start`, matching the `start` script convention this framework expects
   * every consumer's e2e package.json to define. */
  serveCommand?: string;
  /** Skip wiring an automatic `webServer` (e.g. the consumer boots its own server externally). */
  webServer?: false;
}

/**
 * Thin `@playwright/test` `defineConfig` wrapper that applies this framework's shared
 * conventions: environment-driven retries/workers/trace/video/screenshot modes via
 * {@link ConfigLoader}, a `webServer` that boots the consumer's app via its `start` script and
 * reuses an already-running instance outside CI, and a report title tagged with `prefix`.
 */
export function definePlaywrightConfig(options: DefinePlaywrightConfigOptions): PlaywrightTestConfig {
  const { prefix, serveCommand, webServer: webServerOverride, use, ...rest } = options;
  const flags = parseFlags();
  const env = ConfigLoader.load();

  return defineConfig({
    retries: env.retries,
    workers: env.workers,
    reporter: [['html', { outputFolder: 'playwright-report', open: 'never', title: `${prefix} E2E Report` }]],
    ...rest,
    use: {
      baseURL: flags.baseUrl,
      trace: env.traceMode,
      video: env.videoMode,
      screenshot: env.screenshotMode,
      ...use,
    },
    webServer:
      webServerOverride === false
        ? undefined
        : {
            command: serveCommand ?? 'npm run start',
            url: flags.baseUrl,
            reuseExistingServer: !flags.isCI,
            timeout: 120_000,
          },
  });
}

const CATALOG_DEVICE_MATRIX: BrowserEngine[] = ['firefox', 'webkit'];
const CATALOG_VIEWPORTS = ['iPhone 14', 'iPad Pro 11', 'Pixel 7'];

/**
 * Preset cross-browser + cross-viewport project set for specs that opt into full device coverage
 * (as distinct from a suite's default single-desktop-Chrome project). `name` becomes each
 * project's prefix (e.g. `catalog` -> `catalog`, `catalog-firefox`, `catalog-iphone-14`, ...) and
 * `testMatch` scopes every generated project to the same spec subset.
 */
export function catalogProjects(name: string, testMatch: RegExp): Project[] {
  const base: BaseProjectDefinition = {
    name,
    testMatch,
    use: {},
  };
  return expandProjectsAcrossDevices([base], {
    browsers: CATALOG_DEVICE_MATRIX,
    devices: CATALOG_VIEWPORTS,
  });
}
