import type { Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import type { Result as AxeViolation } from 'axe-core';
import { WCAG_21_AA_TAGS, type A11yAuditOptions } from './WcagRules.js';

export class A11yAuditor {
  static async auditPage(page: Page, options: A11yAuditOptions = {}) {
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
    };
  }

  static async assertNoCriticalOrSeriousViolations(page: Page, options: A11yAuditOptions = {}): Promise<void> {
    const result = await this.auditPage(page, options);
    const criticalOrSerious = result.violations.filter(
      (v: AxeViolation) => v.impact === 'critical' || v.impact === 'serious',
    );

    if (criticalOrSerious.length > 0) {
      const summary = criticalOrSerious
        .map((v: AxeViolation) => `[${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`)
        .join('\n');
      throw new Error(`[A11yAuditor] WCAG Violations found:\n${summary}`);
    }
  }
}
