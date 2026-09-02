# Bien LXP Enterprise Testing Platform

A scalable, decoupled, 100% open-source automated test engineering and performance platform.

## Architecture
- **`packages/core` (`@open-test/playwright-core`)**: The reusable, agnostic open-source testing engine containing Base Pages, Tasks, CSV/Excel Data-Driven Testing (DDT), Browser Forensics & HAR recording, Performance/CWV metrics, k6 load bridge, and AI-powered failure root cause analysis.
- **`packages/lxp` (`@bien/lxp-e2e`)**: The Bien LXP enterprise domain implementation containing Page Objects, Tasks, Multi-Role Personas, Mock Provider, and tagged Smoke/Regression test suites.

## Quickstart Commands

```bash
# Run all Smoke tests (@smoke)
pnpm --dir tests/packages/lxp test:smoke

# Run all Data-Driven tests (@ddt)
pnpm --dir tests/packages/lxp test:ddt

# Run Core Web Vitals & Performance benchmarks (@perf)
pnpm --dir tests/packages/lxp test:perf

# Run WCAG 2.1 AA Accessibility suite (@accessibility)
pnpm --dir tests/packages/lxp test:a11y

# Run Full Regression suite (@regression)
pnpm --dir tests/packages/lxp test:regression

# Generate Living Documentation (docs/living-documentation/LXP_TEST_SPECIFICATIONS.md)
pnpm --dir tests/packages/core generate:living-docs
```

## Package docs
- [`packages/core` README](./packages/core/README.md) — install/quickstart for the standalone engine
- [`packages/core` CONTRIBUTING](./packages/core/CONTRIBUTING.md)

## Monorepo-level documentation

These live at the workspace root because they cover both `core` and `lxp` today. If/when
`packages/core` is mirrored out to its own public repo (see the Open-Source Framework Guide below),
its own conceptual docs should move into `packages/core/docs/` so they travel with it.

- [Test Strategy](../docs/test-strategy.md)
- [Test Architecture](../docs/test-architecture.md)
- [Test Data Strategy](../docs/test-data-strategy.md)
- [Smoke & Regression Strategy](../docs/smoke-regression-strategy.md)
- [Data-Driven Testing Guide](../docs/data-driven-testing-guide.md)
- [Performance & Load Testing Strategy](../docs/performance-and-load-strategy.md)
- [AI Failure Analyzer Guide](../docs/ai-failure-analyzer-guide.md)
- [Living Documentation Guide](../docs/living-documentation-guide.md)
- [Open-Source Framework Guide](../docs/open-source-framework-guide.md)
- [Test Traceability Matrix (RTM)](../docs/traceability/test-traceability-matrix.md)
