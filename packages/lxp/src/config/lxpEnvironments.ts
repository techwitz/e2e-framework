import { ConfigLoader } from '@open-test/playwright-core';

export const lxpConfig = ConfigLoader.load({
  baseUrl: process.env.BASE_URL ?? 'http://127.0.0.1:35173',
  apiUrl: process.env.API_URL ?? 'http://127.0.0.1:30080',
});

export const LXP_PERSONAS = {
  learner: {
    userCode: 'USR-E2E-LEARNER',
    email: 'learner@example.test',
    role: 'LEARNER',
    workspaceCode: 'DEMO',
  },
  manager: {
    userCode: 'USR-E2E-MANAGER',
    email: 'manager@example.test',
    role: 'LEARNING_MANAGER',
    workspaceCode: 'DEMO',
  },
  admin: {
    userCode: 'USR-E2E-ADMIN',
    email: 'admin@example.test',
    role: 'WORKSPACE_ADMIN',
    workspaceCode: 'DEMO',
  },
  instructor: {
    userCode: 'USR-E2E-INSTRUCTOR',
    email: 'instructor@example.test',
    role: 'INSTRUCTOR',
    workspaceCode: 'DEMO',
  },
  hostAdmin: {
    userCode: 'USR-E2E-HOST',
    email: 'hostadmin@example.test',
    role: 'SUPER_ADMIN',
    workspaceCode: 'HOST',
  },
};
