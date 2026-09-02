import { devices, type Project } from '@playwright/test';

export type BrowserEngine = 'chromium' | 'firefox' | 'webkit';

/** A project definition before device/browser expansion — same shape Playwright's own
 * `projects` array entries take (`name` + `use`, plus whatever else you pass through, e.g.
 * `grep`/`grepInvert`/`testMatch`/`dependencies`). */
export interface BaseProjectDefinition extends Omit<Project, 'name' | 'use'> {
  name: string;
  use: Project['use'];
}

export interface DeviceMatrixOptions {
  /**
   * Extra browser engines to fan each base project out across, beyond whatever engine the base
   * project itself already uses. E.g. `['firefox', 'webkit']` turns one `chromium` project into
   * three: the original plus `<name>-firefox` and `<name>-webkit`.
   */
  browsers?: BrowserEngine[];
  /**
   * Extra named Playwright device descriptors (any key from `@playwright/test`'s `devices`
   * export, e.g. `'iPhone 14'`, `'Pixel 7'`, `'iPad Pro 11'`) to fan each base project out
   * across for responsive/mobile coverage. Unknown device names are skipped, not thrown on —
   * a typo shouldn't take down the whole config.
   */
  devices?: string[];
}

const ENGINE_DEVICE_PROFILE: Record<BrowserEngine, string> = {
  chromium: 'Desktop Chrome',
  firefox: 'Desktop Firefox',
  webkit: 'Desktop Safari',
};

/**
 * Expands a small set of "real" projects (one per app/base-URL/tag-filter you actually need)
 * into the full cross-browser + responsive/device matrix, without hand-duplicating every
 * project definition. Nothing is expanded unless you actually pass `browsers`/`devices` — call
 * it with an empty options object (or don't call it at all) and you get your base projects back
 * unchanged, so wiring this in never silently multiplies a fast local run into a slow one.
 *
 * ```ts
 * import { expandProjectsAcrossDevices } from '@open-test/playwright-core';
 *
 * const extraBrowsers = (process.env.E2E_BROWSERS ?? '').split(',').filter(Boolean) as BrowserEngine[];
 * const extraDevices = (process.env.E2E_DEVICES ?? '').split(',').filter(Boolean);
 *
 * export default defineConfig({
 *   projects: expandProjectsAcrossDevices(
 *     [{ name: 'chromium', use: { ...devices['Desktop Chrome'], baseURL } }],
 *     { browsers: extraBrowsers, devices: extraDevices },
 *   ),
 * });
 * ```
 *
 * Run the default fast set with `playwright test`, the full cross-browser grid with
 * `E2E_BROWSERS=firefox,webkit playwright test`, mobile/responsive coverage with
 * `E2E_DEVICES="iPhone 14,Pixel 7" playwright test`, or one specific generated project with
 * Playwright's own `--project=chromium-webkit` / `--project=chromium-iphone-14` flag.
 */
export function expandProjectsAcrossDevices(
  baseProjects: BaseProjectDefinition[],
  options: DeviceMatrixOptions = {},
): Project[] {
  const browsers = options.browsers ?? [];
  const deviceNames = options.devices ?? [];
  const expanded: Project[] = [];

  for (const base of baseProjects) {
    expanded.push(base as Project);

    for (const engine of browsers) {
      const profile = devices[ENGINE_DEVICE_PROFILE[engine]];
      if (!profile) continue;
      expanded.push({
        ...base,
        name: `${base.name}-${engine}`,
        use: { ...base.use, ...profile },
      });
    }

    for (const deviceName of deviceNames) {
      const profile = devices[deviceName];
      if (!profile) continue;
      expanded.push({
        ...base,
        name: `${base.name}-${slugifyDeviceName(deviceName)}`,
        use: { ...base.use, ...profile },
      });
    }
  }

  return expanded;
}

function slugifyDeviceName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
