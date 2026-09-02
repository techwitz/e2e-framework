import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  timeout?: number;
}

export abstract class BaseApiClient {
  constructor(
    protected readonly request: APIRequestContext,
    protected readonly baseUrl: string,
    protected defaultHeaders: Record<string, string> = {},
  ) {}

  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  protected async get(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    const url = this.resolveUrl(path);
    return this.request.get(url, {
      headers: { ...this.defaultHeaders, ...options.headers },
      params: options.params as any,
      timeout: options.timeout,
    });
  }

  protected async post(path: string, data?: unknown, options: ApiRequestOptions = {}): Promise<APIResponse> {
    const url = this.resolveUrl(path);
    return this.request.post(url, {
      headers: { ...this.defaultHeaders, ...options.headers },
      data: data ?? options.data,
      params: options.params as any,
      timeout: options.timeout,
    });
  }

  protected async put(path: string, data?: unknown, options: ApiRequestOptions = {}): Promise<APIResponse> {
    const url = this.resolveUrl(path);
    return this.request.put(url, {
      headers: { ...this.defaultHeaders, ...options.headers },
      data: data ?? options.data,
      params: options.params as any,
      timeout: options.timeout,
    });
  }

  protected async patch(path: string, data?: unknown, options: ApiRequestOptions = {}): Promise<APIResponse> {
    const url = this.resolveUrl(path);
    return this.request.patch(url, {
      headers: { ...this.defaultHeaders, ...options.headers },
      data: data ?? options.data,
      params: options.params as any,
      timeout: options.timeout,
    });
  }

  protected async delete(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    const url = this.resolveUrl(path);
    return this.request.delete(url, {
      headers: { ...this.defaultHeaders, ...options.headers },
      params: options.params as any,
      timeout: options.timeout,
    });
  }

  private resolveUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanBase = this.baseUrl.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${cleanBase}/${cleanPath}`;
  }
}
