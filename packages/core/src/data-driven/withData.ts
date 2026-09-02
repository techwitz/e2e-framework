import { test as baseTest } from '@playwright/test';
import type { z } from 'zod';
import { CsvDataProvider } from './CsvDataProvider.js';
import { ExcelDataProvider } from './ExcelDataProvider.js';
import { JsonDataProvider } from './JsonDataProvider.js';
import type { DataProviderOptions } from './types.js';

/**
 * Reads the fixture names a caller-supplied test function destructures from its
 * first parameter (e.g. `async ({ page, loginAs }, dataRow) => ...` -> ['page', 'loginAs']),
 * so `withData().test()` can generate a Playwright-compatible wrapper with the
 * same destructuring pattern. Returns [] if the first parameter isn't a simple
 * object-destructuring pattern (falls back to zero fixtures).
 */
function extractDestructuredFixtureNames(fn: (...args: any[]) => any): string[] {
  const source = fn.toString();
  const match = source.match(/^(?:async\s*)?\(\s*\{([^}]*)\}/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((part) => part.trim().split(':')[0].split('=')[0].trim())
    .filter(Boolean);
}

export function withData<TRow = Record<string, any>>(
  filePath: string,
  sheetOrOptions?: string | DataProviderOptions,
  schema?: z.ZodType<TRow>,
) {
  let options: DataProviderOptions = {};
  if (typeof sheetOrOptions === 'string') {
    options.sheetName = sheetOrOptions;
  } else if (sheetOrOptions) {
    options = sheetOrOptions;
  }

  let provider: CsvDataProvider | ExcelDataProvider | JsonDataProvider;
  if (filePath.endsWith('.csv')) {
    provider = new CsvDataProvider();
  } else if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
    provider = new ExcelDataProvider();
  } else if (filePath.endsWith('.json')) {
    provider = new JsonDataProvider();
  } else {
    throw new Error(`[withData] Unsupported dataset format: ${filePath}`);
  }

  return {
    async loadRows(): Promise<TRow[]> {
      return provider.load<TRow>(filePath, schema, options);
    },

    test(
      titlePattern: string,
      testFn: (fixtures: any, dataRow: TRow, index: number) => Promise<void>,
      customTestRunner: any = baseTest,
    ) {
      // Lazy load rows when defining tests
      // For Playwright parameterized execution:
      customTestRunner.describe(`DDT: ${filePath}`, () => {
        let rows: TRow[] = [];
        customTestRunner.beforeAll(async () => {
          rows = await provider.load<TRow>(filePath, schema, options);
        });

        const runRows = async (fixtures: Record<string, any>) => {
          if (rows.length === 0) {
            rows = await provider.load<TRow>(filePath, schema, options);
          }
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            await customTestRunner.step(`Row ${i + 1}: ${JSON.stringify(row).slice(0, 80)}...`, async () => {
              await testFn(fixtures, row, i);
            });
          }
        };

        // Playwright statically parses the callback passed to `test()` to see which
        // fixtures it destructures, so it can resolve exactly those. We don't know
        // `testFn`'s fixture names ahead of time (it's caller-supplied), so we read
        // them off `testFn`'s own source text and generate a wrapper with a matching
        // destructuring pattern — Playwright parses the wrapper we hand it, not
        // `testFn` itself, so the wrapper's signature has to carry the real names.
        const fixtureNames = extractDestructuredFixtureNames(testFn);
        const wrapper = fixtureNames.length
          ? (new Function(
              'runRows',
              `return async ({ ${fixtureNames.join(', ')} }) => runRows({ ${fixtureNames.join(', ')} });`,
            ))(runRows)
          : async () => runRows({});

        customTestRunner('parameterized suite runner', wrapper);
      });
    },
  };
}
