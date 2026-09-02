import { BaseApiClient } from '@open-test/playwright-core';
import type { APIRequestContext } from '@playwright/test';

export class LxpUserClient extends BaseApiClient {
  constructor(request: APIRequestContext, baseUrl = 'http://127.0.0.1:30080') {
    super(request, baseUrl, {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });
  }

  async getProfile(token: string) {
    return this.get('/api/v1/user/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async listUsers(token: string, params: { page?: number; size?: number } = {}) {
    return this.get('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
  }
}
