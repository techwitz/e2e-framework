import { randomBytes } from 'node:crypto';

export class StringUtils {
  static randomHex(length = 8): string {
    return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  static randomEmail(prefix = 'e2e-user', domain = 'example.test'): string {
    return `${prefix}-${this.randomHex(6)}@${domain}`;
  }

  static randomBusinessKey(prefix: string, length = 6): string {
    return `${prefix}-${this.randomHex(length).toUpperCase()}`;
  }

  static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
