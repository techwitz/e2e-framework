import type { ParsedScenario } from './LivingDocGenerator.js';

export class GherkinExporter {
  static exportToFeature(featureName: string, scenarios: ParsedScenario[]): string {
    let out = `Feature: ${featureName}\n\n`;
    for (const sc of scenarios) {
      out += `  @${sc.tags.join(' @')}\n`;
      out += `  Scenario: ${sc.title}\n`;
      out += `    Given the test preconditions are satisfied\n`;
      out += `    When the test scenario executes\n`;
      out += `    Then the business assertions pass\n\n`;
    }
    return out;
  }
}
