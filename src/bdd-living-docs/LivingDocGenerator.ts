import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface ParsedScenario {
  testId?: string;
  title: string;
  file: string;
  tags: string[];
  steps: { kind: string; text: string }[];
}

export class LivingDocGenerator {
  static async scanDirectory(dir: string): Promise<ParsedScenario[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
    const scenarios: ParsedScenario[] = [];

    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.smoke.spec.ts'))) {
        const fullPath = path.join(entry.parentPath ?? dir, entry.name);
        const content = await fs.readFile(fullPath, 'utf-8');
        const parsed = this.parseSpecFile(fullPath, content);
        scenarios.push(...parsed);
      }
    }
    return scenarios;
  }

  static parseSpecFile(filePath: string, content: string): ParsedScenario[] {
    const scenarios: ParsedScenario[] = [];
    const testBlocks = content.split(/test\(\s*['"`]/g);

    for (let i = 1; i < testBlocks.length; i++) {
      const block = testBlocks[i];
      const endTitleIdx = block.search(/['"`]\s*,\s*async/);
      if (endTitleIdx === -1) continue;

      const title = block.slice(0, endTitleIdx);
      const testIdMatch = title.match(/\[(TC-[A-Z]+-\d+)\]/);
      const testId = testIdMatch ? testIdMatch[1] : undefined;
      const tagsMatch = title.match(/@[a-zA-Z0-9_-]+/g);
      const tags = tagsMatch ? tagsMatch : [];

      // Extract BDD steps
      const steps: { kind: string; text: string }[] = [];
      const stepRegex = /(Given|When|Then|And)\(\s*['"`](.*?)['"`]/g;
      let stepMatch: RegExpExecArray | null;

      while ((stepMatch = stepRegex.exec(block)) !== null) {
        steps.push({ kind: stepMatch[1], text: stepMatch[2] });
      }

      scenarios.push({
        testId,
        title,
        file: path.basename(filePath),
        tags,
        steps,
      });
    }

    return scenarios;
  }

  static generateMarkdown(scenarios: ParsedScenario[], projectTitle = 'Executable Living Test Specifications'): string {
    let md = `# ${projectTitle}\n\n`;
    md += `*Generated automatically from Playwright test definitions on ${new Date().toISOString().split('T')[0]}*\n\n`;
    md += `## 1. Master Scenario Specification Catalog\n\n`;
    md += `| Test ID | Scenario Title | Source File | Tags |\n`;
    md += `|---|---|---|---|\n`;

    for (const sc of scenarios) {
      md += `| **${sc.testId ?? 'N/A'}** | ${sc.title} | \`${sc.file}\` | ${sc.tags.map((t) => `\`${t}\``).join(' ')} |\n`;
    }

    md += `\n---\n\n## 2. Executable Scenario Details\n\n`;

    for (const sc of scenarios) {
      md += `### ${sc.testId ? `${sc.testId}: ` : ''}${sc.title}\n`;
      md += `- **Source**: \`${sc.file}\`\n`;
      if (sc.tags.length > 0) {
        md += `- **Tags**: ${sc.tags.map((t) => `\`${t}\``).join(' ')}\n`;
      }
      if (sc.steps.length > 0) {
        md += `- **BDD Steps**:\n`;
        for (const st of sc.steps) {
          md += `  - **${st.kind.toUpperCase()}** ${st.text}\n`;
        }
      }
      md += `\n`;
    }

    return md;
  }
}
