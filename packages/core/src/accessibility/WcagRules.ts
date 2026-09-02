export const WCAG_21_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'section508'];

export interface A11yAuditOptions {
  includeTags?: string[];
  excludeRules?: string[];
  scopeSelector?: string;
}
