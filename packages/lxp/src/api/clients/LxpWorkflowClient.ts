import { BaseApiClient } from '@open-test/playwright-core';

export class LxpWorkflowClient extends BaseApiClient {
  async getInbox(token: string) {
    return this.get('/api/v1/workflows/inbox', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async approveTask(taskCode: string, comments: string, token: string) {
    return this.post(`/api/v1/workflows/tasks/${taskCode}/approve`, { comments }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async rejectTask(taskCode: string, comments: string, token: string) {
    return this.post(`/api/v1/workflows/tasks/${taskCode}/reject`, { comments }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async submitRequest(workflowCode: string, payload: Record<string, any>, token: string) {
    return this.post(`/api/v1/workflows/${workflowCode}/submit`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
