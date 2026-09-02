import { promises as fs } from 'node:fs';
import { parse } from 'csv-parse/sync';
import type { z } from 'zod';
import type { IDataProvider, DataProviderOptions } from './types.js';
import { DataTransformer } from './DataTransformer.js';

export class CsvDataProvider implements IDataProvider {
  async load<T = Record<string, unknown>>(
    filePath: string,
    schema?: z.ZodType<T>,
    options: DataProviderOptions = {},
  ): Promise<T[]> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const records: Array<Record<string, any>> = parse(fileContent, {
      columns: options.hasHeader ?? true,
      skip_empty_lines: true,
      delimiter: options.delimiter ?? ',',
      trim: true,
    });

    const transform = options.transformTokens ?? true;
    const processed = records.map((rec) => (transform ? DataTransformer.transformObject(rec) : rec));

    if (schema) {
      return processed.map((rec, idx) => {
        const parsed = schema.safeParse(rec);
        if (!parsed.success) {
          throw new Error(`[CsvDataProvider] Validation error at row ${idx + 1} in ${filePath}: ${parsed.error.message}`);
        }
        return parsed.data;
      });
    }

    return processed as T[];
  }
}
