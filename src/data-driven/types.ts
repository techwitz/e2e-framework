import type { z } from 'zod';

export interface DataProviderOptions {
  sheetName?: string;
  delimiter?: string;
  hasHeader?: boolean;
  transformTokens?: boolean;
}

export interface IDataProvider<T = Record<string, unknown>> {
  load(filePath: string, schema?: z.ZodType<T>, options?: DataProviderOptions): Promise<T[]>;
}
