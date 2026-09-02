import { BaseApiClient } from '@open-test/playwright-core';

export class LxpSkillClient extends BaseApiClient {
  async getSkillGapAnalysis(token: string) {
    return this.get('/api/v1/learner/skills/gap-analysis', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getTeamSkillsMatrix(token: string) {
    return this.get('/api/v1/manager/team-capabilities', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
