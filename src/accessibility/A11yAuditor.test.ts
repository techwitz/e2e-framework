import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from '@playwright/test';
import type { Result as AxeViolation } from 'axe-core';
import { A11yAuditor, type A11yAuditResult } from './A11yAuditor.js';

function makeViolation(
  id: string,
  impact: AxeViolation['impact'],
  help = 'Fix accessibility issue',
): AxeViolation {
  return {
    id,
    impact,
    help,
    description: help,
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/' + id,
    tags: ['wcag2aa'],
    nodes: [{ html: '<div></div>', target: ['div'], failureSummary: 'Fix issue' }],
  } as AxeViolation;
}

function makeResult(violations: AxeViolation[]): A11yAuditResult {
  return {
    violations,
    passes: 10,
    incomplete: 0,
    hasCriticalViolations: violations.some((v) => v.impact === 'critical'),
    hasSeriousViolations: violations.some((v) => v.impact === 'serious'),
    hasModerateViolations: violations.some((v) => v.impact === 'moderate'),
    hasMinorViolations: violations.some((v) => v.impact === 'minor'),
  };
}

describe('A11yAuditor WCAG 2.1 AA compliance enforcement', () => {
  const originalAuditPage = A11yAuditor.auditPage;
  const fakePage = {} as Page;

  afterEach(() => {
    A11yAuditor.auditPage = originalAuditPage;
  });

  it('passes when there are zero WCAG 2.1 AA violations', async () => {
    A11yAuditor.auditPage = async () => makeResult([]);
    await assert.doesNotReject(() => A11yAuditor.assertCompliant(fakePage));
  });

  it('fails by default on moderate or minor WCAG 2.1 AA violations', async () => {
    A11yAuditor.auditPage = async () =>
      makeResult([makeViolation('region', 'moderate', 'All page content should be contained by landmarks')]);

    await assert.rejects(
      () => A11yAuditor.assertCompliant(fakePage),
      /\[A11yAuditor\] WCAG Violations found:\n\[MODERATE\] region:/,
    );

    await assert.rejects(
      () => A11yAuditor.assertNoCriticalOrSeriousViolations(fakePage),
      /\[A11yAuditor\] WCAG Violations found:\n\[MODERATE\] region:/,
    );
  });

  it('allows moderate and minor violations only when allowModerateMinor is explicitly true', async () => {
    A11yAuditor.auditPage = async () =>
      makeResult([
        makeViolation('region', 'moderate', 'Landmarks required'),
        makeViolation('empty-heading', 'minor', 'Headings should not be empty'),
      ]);

    await assert.doesNotReject(() =>
      A11yAuditor.assertCompliant(fakePage, { allowModerateMinor: true }),
    );
  });

  it('still fails on critical or serious violations even when allowModerateMinor is true', async () => {
    A11yAuditor.auditPage = async () =>
      makeResult([
        makeViolation('color-contrast', 'serious', 'Elements must meet minimum color contrast ratio thresholds'),
        makeViolation('region', 'moderate', 'Landmarks required'),
      ]);

    await assert.rejects(
      () => A11yAuditor.assertCompliant(fakePage, { allowModerateMinor: true }),
      /\[SERIOUS\] color-contrast:/,
    );
  });
});
