import { BaseApiClient } from '@open-test/playwright-core';
import type { APIRequestContext } from '@playwright/test';

export class LxpAuthClient extends BaseApiClient {
  constructor(request: APIRequestContext, baseUrl = 'http://127.0.0.1:30080') {
    super(request, baseUrl, {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });
  }

  async login(email: string, password = 'DemoPassword123!') {
    return this.post('/api/v1/auth/login', { email, password });
  }

  async refreshToken(refreshToken: string) {
    return this.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
  }

  async logout(accessToken: string) {
    return this.post('/api/v1/auth/logout', {}, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
