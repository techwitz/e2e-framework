import { BaseFactory, StringUtils } from '@open-test/playwright-core';
import type { LxpUserClient } from '../api/clients/LxpUserClient.js';

export interface UserEntity {
  userCode: string;
  email: string;
  roles: string[];
  workspaceCode: string;
  status: string;
}

export class LxpUserFactory extends BaseFactory<UserEntity> {
  constructor(private readonly userClient?: LxpUserClient) {
    super();
  }

  build(overrides: Partial<UserEntity> = {}): UserEntity {
    const userCode = overrides.userCode ?? StringUtils.randomBusinessKey('USR', 6);
    return {
      userCode,
      email: overrides.email ?? StringUtils.randomEmail('e2e-user'),
      roles: overrides.roles ?? ['LEARNER'],
      workspaceCode: overrides.workspaceCode ?? 'DEMO',
      status: overrides.status ?? 'ACTIVE',
      ...overrides,
    };
  }

  async create(overrides: Partial<UserEntity> = {}): Promise<UserEntity> {
    const entity = this.build(overrides);
    // In live mode with API client, we would persist it; in mock mode return synthetic entity
    return entity;
  }
}

export interface CourseEntity {
  courseCode: string;
  title: string;
  description: string;
  status: string;
  category: string;
  durationMinutes: number;
}

export class LxpCourseFactory extends BaseFactory<CourseEntity> {
  build(overrides: Partial<CourseEntity> = {}): CourseEntity {
    const courseCode = overrides.courseCode ?? StringUtils.randomBusinessKey('CRS', 6);
    return {
      courseCode,
      title: overrides.title ?? `E2E Course ${StringUtils.randomHex(4)}`,
      description: overrides.description ?? 'Automated test seeded course description',
      status: overrides.status ?? 'PUBLISHED',
      category: overrides.category ?? 'ENGINEERING',
      durationMinutes: overrides.durationMinutes ?? 120,
      ...overrides,
    };
  }

  async create(overrides: Partial<CourseEntity> = {}): Promise<CourseEntity> {
    return this.build(overrides);
  }
}
