import { StringUtils } from '@open-test/playwright-core';

export class CoursePayloadBuilder {
  private payload = {
    course_code: StringUtils.randomBusinessKey('CRS', 6),
    title: `Architecting Microservices ${StringUtils.randomHex(4)}`,
    description: 'Enterprise production-ready course build',
    category: 'ENGINEERING',
    level: 'ADVANCED',
    duration_minutes: 180,
    status: 'PUBLISHED',
  };

  withTitle(title: string) {
    this.payload.title = title;
    return this;
  }

  withCategory(category: string) {
    this.payload.category = category;
    return this;
  }

  build() {
    return { ...this.payload };
  }
}
