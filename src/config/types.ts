export interface EnvironmentConfig {
  baseUrl: string;
  apiUrl: string;
  apiMode: 'live' | 'mock';
  defaultTimeoutMs: number;
  navigationTimeoutMs: number;
  actionTimeoutMs: number;
  retries: number;
  workers: number;
  traceMode: 'on-first-retry' | 'retain-on-failure' | 'on' | 'off';
  videoMode: 'retain-on-failure' | 'on' | 'off';
  screenshotMode: 'only-on-failure' | 'on' | 'off';
  harMode: 'on-failure' | 'always' | 'never';
  aiAnalyzerEnabled: boolean;
  aiProvider: 'gemini' | 'openai' | 'ollama' | 'claude' | 'none';
  customEnvVariables: Record<string, string>;
}

export interface PersonaCredentials {
  userCode: string;
  email: string;
  password?: string;
  role: string;
  workspaceCode: string;
  token?: string;
}
