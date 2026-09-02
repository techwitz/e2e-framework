import { test as base, expect, type Page } from '@playwright/test';
import {
  CoreWebVitalsCollector,
  NetworkPerformanceTracker,
  HarRecorder,
  TelemetryCollector,
  DiagnosticBundle,
  AiFailureAnalyzer,
} from '@open-test/playwright-core';
import { LxpLoginPage, LearnerDashboardPage, CatalogPage, ManagerDashboardPage, AdminDirectoryPage, NotificationsPage } from '../pages/index.js';
import { LoginAsTask, EnrollInCourseTask } from '../tasks/index.js';
import { LxpUserFactory, LxpCourseFactory, LxpSkillFactory } from '../factories/index.js';
import { LxpMockProvider } from '../mocks/LxpMockProvider.js';
import { LXP_PERSONAS } from '../config/lxpEnvironments.js';
import { SessionManager } from '@open-test/playwright-core';
import { createLxpRoleSeed } from '../auth/lxpSessionSeed.js';
import path from 'node:path';

export interface LxpFixtures {
  // Personas with pre-authenticated sessions
  learnerPage: Page;
  managerPage: Page;
  adminPage: Page;

  // Pages
  loginPage: LxpLoginPage;
  learnerDashboardPage: LearnerDashboardPage;
  catalogPage: CatalogPage;
  managerDashboardPage: ManagerDashboardPage;
  adminDirectoryPage: AdminDirectoryPage;
  notificationsPage: NotificationsPage;

  // Tasks
  loginAs: (persona: 'learner' | 'manager' | 'admin' | 'instructor' | 'hostAdmin', targetPath?: string) => Promise<void>;
  enrollInCourse: (courseTitleOrCode: string) => Promise<void>;

  // Factories
  userFactory: LxpUserFactory;
  courseFactory: LxpCourseFactory;
  skillFactory: LxpSkillFactory;

  // Performance & Forensics
  cwvCollector: CoreWebVitalsCollector;
  networkTracker: NetworkPerformanceTracker;
}

export const test = base.extend<LxpFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LxpLoginPage(page));
  },
  learnerDashboardPage: async ({ page }, use) => {
    await use(new LearnerDashboardPage(page));
  },
  catalogPage: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
  managerDashboardPage: async ({ page }, use) => {
    await use(new ManagerDashboardPage(page));
  },
  adminDirectoryPage: async ({ page }, use) => {
    await use(new AdminDirectoryPage(page));
  },
  notificationsPage: async ({ page }, use) => {
    await use(new NotificationsPage(page));
  },

  userFactory: async ({}, use) => {
    await use(new LxpUserFactory());
  },
  courseFactory: async ({}, use) => {
    await use(new LxpCourseFactory());
  },
  skillFactory: async ({}, use) => {
    await use(new LxpSkillFactory());
  },

  cwvCollector: async ({ page }, use) => {
    await use(new CoreWebVitalsCollector(page));
  },
  networkTracker: async ({ page }, use) => {
    const tracker = new NetworkPerformanceTracker();
    tracker.attach(page);
    await use(tracker);
  },

  loginAs: async ({ page }, use) => {
    const task = new LoginAsTask(page);
    await use((persona, targetPath) => task.performAs({ persona, targetPath }));
  },
  enrollInCourse: async ({ page }, use) => {
    const task = new EnrollInCourseTask(page);
    await use((courseTitleOrCode) => task.performAs({ courseTitleOrCode }));
  },

  learnerPage: async ({ browser }, use, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const creds = LXP_PERSONAS.learner;
    const seed = createLxpRoleSeed(creds.role, creds.userCode, creds.email, creds.workspaceCode);
    await LxpMockProvider.installAllMocks(page);
    await SessionManager.seedSession(page, seed);
    await use(page);
    await context.close();
  },

  managerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const creds = LXP_PERSONAS.manager;
    const seed = createLxpRoleSeed(creds.role, creds.userCode, creds.email, creds.workspaceCode);
    await LxpMockProvider.installAllMocks(page);
    await SessionManager.seedSession(page, seed);
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const creds = LXP_PERSONAS.admin;
    const seed = createLxpRoleSeed(creds.role, creds.userCode, creds.email, creds.workspaceCode);
    await LxpMockProvider.installAllMocks(page);
    await SessionManager.seedSession(page, seed);
    await use(page);
    await context.close();
  },
});

export { expect };
