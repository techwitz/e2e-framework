import { BaseApiClient } from '@open-test/playwright-core';

export class LxpAssessmentClient extends BaseApiClient {
  async getAssessment(assessmentCode: string, token: string) {
    return this.get(`/api/v1/assessment/runner/${assessmentCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async submitAssessment(assessmentCode: string, answers: Record<string, any>, token: string) {
    return this.post(`/api/v1/assessment/runner/${assessmentCode}/submit`, { answers }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
