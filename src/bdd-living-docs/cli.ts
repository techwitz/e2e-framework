import path from 'node:path';
import { promises as fs } from 'node:fs';
import { LivingDocGenerator } from './LivingDocGenerator.js';

/**
 * Generic CLI: scans a spec directory for BDD-style Playwright tests and writes a
 * Markdown living-documentation file. Every path/title is configurable via CLI args
 * or env vars so this works for any consumer project, not just this repo's layout.
 *
 * Usage: tsx src/bdd-living-docs/cli.ts [specDir] [outputPath] [--title "My Project"]
 * Env vars (used when the corresponding arg is omitted): LIVING_DOCS_SPEC_DIR,
 * LIVING_DOCS_OUTPUT_PATH, LIVING_DOCS_PROJECT_TITLE.
 */
async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--title'));
  const titleArg = process.argv.find((a) => a.startsWith('--title='))?.split('=')[1];

  const specDir = path.resolve(
    process.cwd(),
    args[0] ?? process.env.LIVING_DOCS_SPEC_DIR ?? './specs',
  );
  const outputPath = path.resolve(
    process.cwd(),
    args[1] ?? process.env.LIVING_DOCS_OUTPUT_PATH ?? './living-docs/TEST_SPECIFICATIONS.md',
  );
  const projectTitle =
    titleArg ?? process.env.LIVING_DOCS_PROJECT_TITLE ?? 'Executable Living Test Specifications';

  console.log(`[LivingDocGenerator] Scanning specs in: ${specDir}`);
  const scenarios = await LivingDocGenerator.scanDirectory(specDir);
  const markdown = LivingDocGenerator.generateMarkdown(scenarios, projectTitle);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdown, 'utf-8');
  console.log(`[LivingDocGenerator] Wrote ${scenarios.length} specifications to: ${outputPath}`);
}

main().catch(console.error);
