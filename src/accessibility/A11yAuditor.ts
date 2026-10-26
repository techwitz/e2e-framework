import type { Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import type { Result as AxeViolation } from 'axe-core';
import { WCAG_21_AA_TAGS, type A11yAuditOptions } from './WcagRules.js';

export interface A11yAuditResult {
  violations: AxeViolation[];
  passes: number;
  incomplete: number;
  hasCriticalViolations: boolean;
  hasSeriousViolations: boolean;
  hasModerateViolations: boolean;
  hasMinorViolations: boolean;
}

export class A11yAuditor {
  static async auditPage(page: Page, options: A11yAuditOptions = {}): Promise<A11yAuditResult> {
    const builder = new AxeBuilder({ page }).withTags(options.includeTags ?? WCAG_21_AA_TAGS);

    if (options.excludeRules) {
      builder.disableRules(options.excludeRules);
    }
    if (options.scopeSelector) {
      builder.include(options.scopeSelector);
    }

    const results = await builder.analyze();
    return {
      violations: results.violations,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      hasCriticalViolations: results.violations.some((v: AxeViolation) => v.impact === 'critical'),
      hasSeriousViolations: results.violations.some((v: AxeViolation) => v.impact === 'serious'),
      hasModerateViolations: results.violations.some((v: AxeViolation) => v.impact === 'moderate'),
      hasMinorViolations: results.violations.some((v: AxeViolation) => v.impact === 'minor'),
    };
  }

  /**
   * Enforces zero WCAG 2.1 AA violations by default (`allowModerateMinor = false`).
   * All violations (`critical`, `serious`, `moderate`, and `minor`) fail compliance
   * unless `options.allowModerateMinor` is explicitly set to `true`.
   */
  static async assertCompliant(page: Page, options: A11yAuditOptions = {}): Promise<void> {
    const result = await this.auditPage(page, options);
    const allowModerateMinor = options.allowModerateMinor ?? false;
    const blocking = allowModerateMinor
      ? result.violations.filter(
          (v: AxeViolation) => v.impact === 'critical' || v.impact === 'serious',
        )
      : result.violations;

    if (blocking.length > 0) {
      const summary = blocking
        .map(
          (v: AxeViolation) =>
            `[${(v.impact ?? 'unknown').toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} nodes)${describeNodes(v)}`,
        )
        .join('\n');
      throw new Error(`[A11yAuditor] WCAG Violations found:\n${summary}`);
    }
  }

  static async assertNoCriticalOrSeriousViolations(
    page: Page,
    options: A11yAuditOptions = {},
  ): Promise<void> {
    await this.assertCompliant(page, options);
  }
}


/** The first few failing elements by selector, so a failure can be traced without opening the trace. */
function describeNodes(violation: AxeViolation): string {
  const targets = violation.nodes.slice(0, 5).map((node) => node.target.join(' '));
  return targets.length > 0 ? `: ${targets.join(' | ')}` : '';
}
