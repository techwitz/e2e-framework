import type { EnvironmentConfig } from './types.js';

export class EnvConfig {
  static get(key: string, defaultValue = ''): string {
    return process.env[key] ?? defaultValue;
  }

  static getNumber(key: string, defaultValue = 0): number {
    const val = process.env[key];
    if (!val) return defaultValue;
    const num = Number(val);
    return isNaN(num) ? defaultValue : num;
  }

  static getBoolean(key: string, defaultValue = false): boolean {
    const val = process.env[key]?.toLowerCase();
    if (val === 'true' || val === '1' || val === 'yes') return true;
    if (val === 'false' || val === '0' || val === 'no') return false;
    return defaultValue;
  }
}

export class ConfigLoader {
  static load(overrides: Partial<EnvironmentConfig> = {}): EnvironmentConfig {
    const isCI = EnvConfig.getBoolean('CI', false);
    const apiMode = (EnvConfig.get('E2E_API_MODE', 'mock') as 'live' | 'mock');

    return {
      baseUrl: EnvConfig.get('BASE_URL', 'http://localhost:3000'),
      apiUrl: EnvConfig.get('API_URL', 'http://localhost:8080'),
      apiMode,
      defaultTimeoutMs: EnvConfig.getNumber('TIMEOUT_DEFAULT', 30_000),
      navigationTimeoutMs: EnvConfig.getNumber('TIMEOUT_NAV', 30_000),
      actionTimeoutMs: EnvConfig.getNumber('TIMEOUT_ACTION', 15_000),
      retries: isCI ? EnvConfig.getNumber('RETRIES', 2) : EnvConfig.getNumber('RETRIES', 0),
      workers: isCI ? EnvConfig.getNumber('WORKERS', 2) : EnvConfig.getNumber('WORKERS', 4),
      traceMode: (EnvConfig.get('TRACE_MODE', 'retain-on-failure') as any),
      videoMode: (EnvConfig.get('VIDEO_MODE', 'retain-on-failure') as any),
      screenshotMode: (EnvConfig.get('SCREENSHOT_MODE', 'only-on-failure') as any),
      harMode: (EnvConfig.get('HAR_MODE', 'on-failure') as any),
      aiAnalyzerEnabled: EnvConfig.getBoolean('AI_ANALYZER_ENABLED', false),
      aiProvider: (EnvConfig.get('AI_PROVIDER', 'gemini') as any),
      customEnvVariables: { ...process.env } as Record<string, string>,
      ...overrides,
    };
  }
}
