export const WCAG_21_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'section508'];

export interface A11yAuditOptions {
  includeTags?: string[];
  excludeRules?: string[];
  scopeSelector?: string;
  /**
   * When false (default), all WCAG 2.1 AA violations (including moderate and minor)
   * fail compliance. Set to true only when explicitly allowing moderate/minor findings.
   */
  allowModerateMinor?: boolean;
}

