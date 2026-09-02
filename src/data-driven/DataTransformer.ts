import { StringUtils } from '../utils/StringUtils.js';
import { DateUtils } from '../utils/DateUtils.js';

export class DataTransformer {
  static transformString(template: string): string {
    return template
      .replace(/\$\{random\.email\}/g, () => StringUtils.randomEmail())
      .replace(/\$\{random\.hex\((\d+)\)\}/g, (_, len) => StringUtils.randomHex(Number(len)))
      .replace(/\$\{uuid\}/g, () => StringUtils.randomBusinessKey('UUID', 8))
      .replace(/\$\{date\.today\}/g, () => DateUtils.todayIso())
      .replace(/\$\{date\.plus\((\d+),\s*['"]days['"]\)\}/g, (_, days) => DateUtils.plusDays(Number(days)))
      .replace(/\$\{date\.minus\((\d+),\s*['"]days['"]\)\}/g, (_, days) => DateUtils.minusDays(Number(days)));
  }

  static transformObject<T extends Record<string, any>>(obj: T): T {
    const clone: Record<string, any> = { ...obj };
    for (const key of Object.keys(clone)) {
      const val = clone[key];
      if (typeof val === 'string') {
        clone[key] = this.transformString(val);
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        clone[key] = this.transformObject(val);
      }
    }
    return clone as T;
  }
}
