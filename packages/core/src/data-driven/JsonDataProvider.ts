import { promises as fs } from 'node:fs';
import type { z } from 'zod';
import type { IDataProvider, DataProviderOptions } from './types.js';
import { DataTransformer } from './DataTransformer.js';

export class JsonDataProvider implements IDataProvider {
  async load<T = Record<string, unknown>>(
    filePath: string,
    schema?: z.ZodType<T>,
    options: DataProviderOptions = {},
  ): Promise<T[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsedJson = JSON.parse(content);
    const records: Array<Record<string, any>> = Array.isArray(parsedJson) ? parsedJson : [parsedJson];

    const transform = options.transformTokens ?? true;
    const processed = records.map((rec) => (transform ? DataTransformer.transformObject(rec) : rec));

    if (schema) {
      return processed.map((rec, idx) => {
        const parsed = schema.safeParse(rec);
        if (!parsed.success) {
          throw new Error(`[JsonDataProvider] Validation error at index ${idx} in ${filePath}: ${parsed.error.message}`);
        }
        return parsed.data;
      });
    }

    return processed as T[];
  }
}
