import { BaseApiClient } from '@open-test/playwright-core';
import type { APIRequestContext } from '@playwright/test';

export class LxpCourseClient extends BaseApiClient {
  constructor(request: APIRequestContext, baseUrl = 'http://127.0.0.1:30080') {
    super(request, baseUrl, {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });
  }

  async getCatalog(params: { page?: number; size?: number; search?: string } = {}) {
    return this.get('/api/v1/catalog/courses', { params });
  }

  async getCourseDetails(courseCode: string) {
    return this.get(`/api/v1/catalog/courses/${courseCode}`);
  }

  async enrollInCourse(courseCode: string, token: string) {
    return this.post(`/api/v1/learner/courses/${courseCode}/enroll`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async updateLessonProgress(courseCode: string, lessonCode: string, progressPercent: number, token: string) {
    return this.post(`/api/v1/learner/courses/${courseCode}/progress`, {
      lesson_code: lessonCode,
      progress_percent: progressPercent,
      status: progressPercent >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
