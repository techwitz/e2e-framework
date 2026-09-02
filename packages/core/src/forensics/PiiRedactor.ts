export class PiiRedactor {
  static redact(text: string): string {
    if (!text) return '';
    return text
      // Redact JWT Bearer tokens
      .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED_JWT]')
      // Redact password fields in JSON
      .replace(/"password"\s*:\s*"[^"]+"/gi, '"password": "[REDACTED_PASSWORD]"')
      // Redact authorization headers
      .replace(/"Authorization"\s*:\s*"[^"]+"/gi, '"Authorization": "[REDACTED_AUTH]"')
      // Redact API keys
      .replace(/(?:api[_-]?key|secret|token)\s*[:=]\s*['"][^'"]+['"]/gi, 'apiKey: "[REDACTED_SECRET]"');
  }
}
