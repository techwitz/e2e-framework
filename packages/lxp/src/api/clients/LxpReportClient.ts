import { BaseApiClient } from '@open-test/playwright-core';

export class LxpReportClient extends BaseApiClient {
  async getExecutiveDashboard(token: string) {
    return this.get('/api/v1/analytics/executive/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async exportIso30414(token: string) {
    return this.get('/api/v1/analytics/executive/iso30414/export', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
