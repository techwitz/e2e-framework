import { defineBddConfig } from 'playwright-bdd';

// `playwright-bdd`'s input-config type (`BDDInputConfig`) isn't re-exported from its
// package root, so it's derived from `defineBddConfig`'s own signature instead of
// importing a path into the package's internals (which would break on an internal
// restructure of a dependency we don't control).
type DefineBddConfigOptions = Parameters<typeof defineBddConfig>[0];

/**
 * Single Source of Truth for wiring a Gherkin BDD "area" into any consumer's
 * playwright.config.ts. Before this existed, `lxp-e2e-tests` called
 * `defineBddConfig` directly with hand-rolled paths (see git history on
 * playwright.config.ts prior to the TNA/TNI BDD rollout) — every consumer
 * re-deriving the same `features/<area>/*.feature` + `steps/<area>/*.steps.ts` +
 * `.features-gen/<area>` convention independently. This function is the one
 * place that convention lives now; a consumer names an area and gets a
 * ready-to-use Playwright `testDir` back, nothing else to duplicate.
 *
 * This is additive to, not a replacement for:
 * - `withData()` (src/data-driven) — CSV/XLSX/JSON-driven `.spec.ts` tests.
 * - `Given/When/Then/And` (src/bdd-living-docs/BddSteps.ts) — lightweight,
 *   `test.step`-based readability inside plain `.spec.ts` files, with
 *   `LivingDocGenerator` producing Markdown docs from them.
 *
 * Real Gherkin (this module) is for scenarios that benefit from being
 * readable and reviewable by non-engineers (L&D, QA, product) as `.feature`
 * files, or that are authored before the implementation exists (see
 * docs/testing/tna-tni/ in course-forge-workspace) and need a durable,
 * executable behavioral contract independent of any one spec file's code.
 */
export interface BddAreaOptions {
  /** Area/feature name — becomes the path segment for features/steps/output (e.g. "tna-tni", "authentication"). */
  name: string;
  /** Base directory features/steps are resolved relative to. Defaults to process.cwd(). */
  baseDir?: string;
  /** Override the default `features/<name>/*.feature` glob. */
  featuresGlob?: string;
  /** Override the default `steps/<name>/*.steps.ts` glob. */
  stepsGlob?: string;
  /** Passed through to playwright-bdd's defineBddConfig verbatim (e.g. `outputDir` override, `importTestFrom`). */
  extra?: Partial<DefineBddConfigOptions>;
}

export function defineBddArea(options: BddAreaOptions): string {
  const { name, featuresGlob, stepsGlob, extra } = options;
  return defineBddConfig({
    features: featuresGlob ?? `features/${name}/*.feature`,
    steps: stepsGlob ?? `steps/${name}/*.steps.ts`,
    outputDir: `.features-gen/${name}`,
    ...extra,
  });
}

/**
 * Convenience for a consumer with several BDD areas (e.g. "tna-tni",
 * "authentication", "learner-journey") — calls `defineBddArea` for each and
 * returns a name→testDir map, so a playwright.config.ts can build one
 * project per area (or one project covering all of them) without repeating
 * the defineBddArea call sites by hand.
 */
export function defineBddAreas(areaNames: string[], sharedOptions: Omit<BddAreaOptions, 'name'> = {}): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of areaNames) {
    result[name] = defineBddArea({ ...sharedOptions, name });
  }
  return result;
}
