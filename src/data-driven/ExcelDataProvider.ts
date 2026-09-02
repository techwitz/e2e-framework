import ExcelJS from 'exceljs';
import type { z } from 'zod';
import type { IDataProvider, DataProviderOptions } from './types.js';
import { DataTransformer } from './DataTransformer.js';

export class ExcelDataProvider implements IDataProvider {
  async load<T = Record<string, unknown>>(
    filePath: string,
    schema?: z.ZodType<T>,
    options: DataProviderOptions = {},
  ): Promise<T[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = options.sheetName ? workbook.getWorksheet(options.sheetName) : workbook.worksheets[0];
    if (!worksheet) {
      throw new Error(`[ExcelDataProvider] Worksheet '${options.sheetName ?? '0'}' not found in ${filePath}`);
    }

    const rows: Array<Record<string, any>> = [];
    const headers: string[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = String(cell.value ?? '').trim();
        });
      } else {
        const rowData: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.value;
          }
        });
        rows.push(rowData);
      }
    });

    const transform = options.transformTokens ?? true;
    const processed = rows.map((rec) => (transform ? DataTransformer.transformObject(rec) : rec));

    if (schema) {
      return processed.map((rec, idx) => {
        const parsed = schema.safeParse(rec);
        if (!parsed.success) {
          throw new Error(`[ExcelDataProvider] Validation error at row ${idx + 2} in ${filePath}: ${parsed.error.message}`);
        }
        return parsed.data;
      });
    }

    return processed as T[];
  }
}
