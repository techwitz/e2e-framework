import type { Page, Route } from '@playwright/test';
import {
  installTenantDashboardMocks,
  installProviderCatalogMocks,
  installReportApiMocks,
  installTaxonomyApiMocks,
  installTenantExecutiveApiMocks,
} from './frontendMockBridge.js';

export class LxpMockProvider {
  /** Admin/tenant-dashboard route mocks reused directly from the frontend's own e2e suite. */
  static async installAdminMocks(page: Page): Promise<void> {
    await installTenantDashboardMocks(page);
    await installProviderCatalogMocks(page);
    await installTaxonomyApiMocks(page);
    await installTenantExecutiveApiMocks(page);
  }

  /** Report-listing mocks reused directly from the frontend's own e2e suite. */
  static async installReportMocks(page: Page): Promise<void> {
    await installReportApiMocks(page);
  }

  static async installAllMocks(page: Page): Promise<void> {
    await this.installAdminMocks(page);
    await this.installReportMocks(page);

    // 1. Abort realtime WS / SSE
    await page.route('**/ws/lxp**', async (r) => r.abort());
    await page.route('**/api/ws/lxp**', async (r) => r.abort());
    await page.route('**/notifications/stream**', async (r) => r.abort());

    // 1b. Lesson video resources — mocked course-player lesson data points `resource_url` at
    // `https://cdn.example.test/*.mp4` (a deliberately non-resolvable RFC 2606 `.test` domain).
    // Left unmocked, a real `<video>` element attempting to load one of these hangs on a genuine
    // failing DNS lookup for several seconds before erroring out — found via a real investigation
    // into TC-PRF-003 consistently measuring ~6s page loads regardless of Vite dev-server compile
    // cache warmth. Fulfilling it immediately with a tiny, real, valid (empty) MP4 response avoids
    // that real network hang.
    await page.route('**/cdn.example.test/**', async (r) => {
      await r.fulfill({ status: 200, contentType: 'video/mp4', body: Buffer.alloc(0) });
    });

    // 2. Unread count & Notifications feed
    await page.route(/\/(?:api\/)?v1\/notifications\/unread-count(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 2 }),
      });
    });

    await page.route(/\/(?:api\/)?v1\/notifications(?:\?.*)?$/, async (r) => {
      if (r.request().method() !== 'GET') {
        await r.continue();
        return;
      }
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            notification_code: 'NTF-E2E-001',
            type: 'ENROLLMENT_APPROVED',
            title: 'Enrollment Approved',
            body: 'You have been enrolled in Cloud Architecture Masterclass.',
            created_at: new Date().toISOString(),
            read: false,
            kind: 'ACTIONABLE',
            cta_label: 'Open Course',
          },
        ]),
      });
    });

    // 3. Workspace nav features — real contract is a bare EffectiveNavFeature[] array
    // (see frontend/packages/api-client/src/index.ts `fetchNavFeatureResolution`), NOT an
    // object map. filterByNavFeatureResolution() calls features.map(...) directly on the
    // response body, so a wrapped/object shape here crashes the whole authenticated shell.
    const NAV_FEATURE_KEYS = [
      'lxp.home',
      'lxp.my_learning',
      'lxp.catalog',
      'lxp.learning_hub',
      'lxp.journeys',
      'lxp.community',
      'lxp.achievements',
      'lxp.capabilities',
      'lxp.skill_gap',
      'lxp.recommendations',
      'lxp.team_activity',
      'lxp.career',
      'lxp.search',
      'lxp.passport',
      'lxp.assistance',
      'lxp.workflow_inbox',
    ];
    await page.route(/\/(?:api\/)?v1\/workspaces\/[^/]+\/nav-features\/resolve(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          NAV_FEATURE_KEYS.map((featureKey) => ({
            featureKey,
            app: 'lxp-app',
            navPath: null,
            parentKey: null,
            visible: true,
            enabled: true,
          })),
        ),
      });
    });

    // 4. Learner home dashboard — real contract is LearnerHomePayload (frontend/packages/
    // api-client/src/index.ts), a much larger shape than a simple {courses} summary. Missing
    // array fields (continue_learning, due_soon, smart_queue, …) crash
    // mapHomePayloadToWidgetPayload() with "Cannot read properties of undefined (reading
    // 'length')" the moment LearnerHomePage renders, since it reads them unconditionally.
    await page.route(/\/(?:api\/)?v1\/learner\/home(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hero: {
            course_code: 'CRS-JAVA-001',
            course_title: 'Spring Boot 4 Architecture & Design',
            reason: 'Continue where you left off',
            progress_percent: 45,
          },
          pulse_v2: {
            streak_days: 7,
            streak_calendar: [true, true, true, true, true, false, false],
            streak_best: 12,
            hours_this_week: 3,
            hours_per_day: [1, 0, 1, 1, 0, 0, 0],
            hours_last_week: 4,
            achievements_unlocked: 2,
            recent_badges: [],
            next_badge: null,
            completions_this_week: 1,
          },
          goal_progress: null,
          smart_queue: [],
          suggestions: [],
          continue_learning: [
            {
              course_code: 'CRS-JAVA-001',
              course_title: 'Spring Boot 4 Architecture & Design',
              progress_percent: 45,
              due_date: null,
            },
          ],
          due_soon: [],
          my_progress: { completed: 4, in_progress: 1, avg_progress_percent: 62 },
          achievement: { total_xp: 1250, level: 3, streak_days: 7, achievements_unlocked: 2 },
          banners: [],
          recommended: [
            {
              course_code: 'CRS-REACT-002',
              course_title: 'Advanced React 19 Patterns',
              progress_percent: 0,
              due_date: null,
            },
          ],
          recent_activity: [],
          skills_snapshot: { tracked_skills: ['Reactive Distributed Systems'], courses_in_progress: 1 },
          skill_snapshot: null,
          trending: [],
          upcoming_ilt: [],
          team_pulse: null,
          compliance_items: [],
          manager_assignment: null,
          aside_widgets: [],
          team_activity_preview: [],
          gamification_enabled: true,
          built_at: new Date().toISOString(),
        }),
      });
    });

    // 5. Catalog Search — real endpoint is CATALOG_SEARCH ('/v1/catalog/search'), not
    // '/v1/catalog/courses' (that path is reserved for CATALOG_COURSE, course-by-code details).
    await page.route(/\/(?:api\/)?v1\/catalog\/search(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 3,
          page: 0,
          size: 9,
          total_pages: 1,
          items: [
            {
              course_code: 'CRS-JAVA-001',
              title: 'Spring Boot 4 Architecture & Design',
              duration_minutes: 240,
              level: 'ADVANCED',
              format: 'SELF_PACED',
              thumbnail_url: null,
            },
            {
              course_code: 'CRS-REACT-002',
              title: 'Advanced React 19 Patterns',
              duration_minutes: 180,
              level: 'INTERMEDIATE',
              format: 'SELF_PACED',
              thumbnail_url: null,
            },
            {
              course_code: 'CRS-EXEC-003',
              title: 'Executive Leadership Strategy',
              duration_minutes: 300,
              level: 'ADVANCED',
              format: 'SELF_PACED',
              thumbnail_url: null,
            },
          ],
        }),
      });
    });

    // 5b. Catalog Facets — real, separate endpoint the FE calls alongside the list (apiPaths.CATALOG_FACETS)
    await page.route(/\/(?:api\/)?v1\/catalog\/facets(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          levels: [
            { value: 'ADVANCED', count: 2 },
            { value: 'INTERMEDIATE', count: 1 },
          ],
          formats: [],
          skills: [],
        }),
      });
    });

    // 6. Course preview & player
    const COURSE_DETAILS_BY_CODE: Record<string, Record<string, unknown>> = {
      'CRS-JAVA-001': {
        course_code: 'CRS-JAVA-001',
        title: 'Spring Boot 4 Architecture & Design',
        description: 'Enterprise modular architectures with Java 26',
        status: 'PUBLISHED',
        lessons: [
          {
            lesson_code: 'LES-001',
            title: 'Modulith Architecture Overview',
            duration_seconds: 600,
            lesson_type: 'VIDEO',
            resource_url: 'https://cdn.example.test/intro.mp4',
          },
        ],
      },
      'CRS-REACT-002': {
        course_code: 'CRS-REACT-002',
        title: 'Advanced React 19 Patterns',
        description: 'Server actions, concurrent rendering & signals',
        status: 'PUBLISHED',
        lessons: [
          {
            lesson_code: 'LES-002',
            title: 'Server Actions Deep Dive',
            duration_seconds: 540,
            lesson_type: 'VIDEO',
            resource_url: 'https://cdn.example.test/react.mp4',
          },
        ],
      },
      'CRS-EXEC-003': {
        course_code: 'CRS-EXEC-003',
        title: 'Executive Leadership Strategy',
        description: 'Strategic leadership for senior stakeholders — requires manager approval',
        status: 'PUBLISHED',
        lessons: [
          {
            lesson_code: 'LES-003',
            title: 'Stakeholder Alignment',
            duration_seconds: 480,
            lesson_type: 'VIDEO',
            resource_url: 'https://cdn.example.test/exec.mp4',
          },
        ],
      },
    };
    await page.route(/\/(?:api\/)?v1\/catalog\/courses\/([^/]+)(?:\?.*)?$/, async (r) => {
      const match = r.request().url().match(/\/catalog\/courses\/([^/?]+)/);
      const courseCode = match ? decodeURIComponent(match[1]) : '';
      const details = COURSE_DETAILS_BY_CODE[courseCode] ?? COURSE_DETAILS_BY_CODE['CRS-JAVA-001'];
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(details),
      });
    });

    // 6b. Course Player — real endpoint is `fetchCoursePlayer()`
    // (GET '/v1/learner/courses/:code/player', LEARNER_COURSES + '/:code/player'), a completely
    // different path/shape than the catalog course-detail route above. This was entirely
    // unmocked, so `CoursePlayerEngine.tsx`'s `loadCoursePlayer()` call always failed — the
    // component's outer `.lxp-course-player-engine` container renders in BOTH the success and
    // error states (an `AlertBanner` on error), so `assertPlayerLoaded()` was passing even though
    // no real lesson/progress content ever rendered. Real `CoursePlayer` shape:
    // {course_code, course_title, overall_progress_percent, lessons: CourseLesson[],
    // lesson_progress: LessonProgress[]}.
    await page.route(
      /\/(?:api\/)?v1\/learner\/courses\/([^/]+)\/player(?:\?.*)?$/,
      async (r) => {
        const match = r.request().url().match(/\/learner\/courses\/([^/?]+)\/player/);
        const courseCode = match ? decodeURIComponent(match[1]) : 'CRS-JAVA-001';
        const details = COURSE_DETAILS_BY_CODE[courseCode] ?? COURSE_DETAILS_BY_CODE['CRS-JAVA-001'];
        const lessons = (details.lessons as Array<Record<string, unknown>>) ?? [];
        await r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            course_code: courseCode,
            course_title: details.title,
            overall_progress_percent: 25,
            lessons: lessons.map((lesson, index) => ({
              ...lesson,
              course_code: courseCode,
              sequence_order: index + 1,
              body: null,
            })),
            lesson_progress: lessons.map((lesson) => ({
              lesson_code: lesson.lesson_code,
              course_code: courseCode,
              status: 'IN_PROGRESS',
              progress_percent: 25,
              seconds_watched: 90,
              last_position: 90,
              visit_count: 1,
              view_count: 1,
              started_at: '2026-09-01T00:00:00Z',
              completed_at: null,
            })),
          }),
        });
      },
    );

    // 6c. Single-enrollment lookup — real endpoint is `fetchLearnerCourseEnrollment()`
    // (GET '/v1/learner/enrollments/:code'), checked by `resolveEnrollment()` before it attempts
    // a fresh self-enroll POST. Returning 404 here (real "not yet enrolled" response) is
    // correct — the component's own try/catch falls through to the real enroll POST, already
    // mocked above.
    await page.route(
      /\/(?:api\/)?v1\/learner\/enrollments\/[^/]+(?:\?.*)?$/,
      async (r) => {
        if (r.request().method() !== 'GET') {
          await r.fallback();
          return;
        }
        await r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({}) });
      },
    );

    // 7. Course Enrollment POST — real endpoint is LEARNER_ENROLLMENTS ('/v1/learner/enrollments',
    // see frontend/packages/api-client/src/index.ts `enrollInCourse`), not
    // '/v1/learner/courses/:code/enroll'. Response shape is EnrollmentItem; courses requiring
    // approval (per src/data/courses/enrollment-rules.xlsx) return the real ENROLLMENT_STATUS
    // value PENDING_APPROVAL instead of ENROLLED, so DDT specs can assert on real branching.
    const APPROVAL_REQUIRED_COURSE_CODES = new Set(['CRS-EXEC-003']);
    const COURSE_TITLES_BY_CODE: Record<string, string> = {
      'CRS-JAVA-001': 'Spring Boot 4 Architecture & Design',
      'CRS-REACT-002': 'Advanced React 19 Patterns',
      'CRS-EXEC-003': 'Executive Leadership Strategy',
    };
    await page.route(/\/(?:api\/)?v1\/learner\/enrollments(?:\?.*)?$/, async (r) => {
      if (r.request().method() !== 'POST') {
        await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        return;
      }
      const body = r.request().postDataJSON() as { course_code?: string } | null;
      const courseCode = body?.course_code ?? 'CRS-JAVA-001';
      const requiresApproval = APPROVAL_REQUIRED_COURSE_CODES.has(courseCode);
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enrollment_code: `ENR-E2E-${Date.now()}`,
          user_code: 'USR-E2E-LEARNER',
          course_code: courseCode,
          course_title: COURSE_TITLES_BY_CODE[courseCode] ?? courseCode,
          status: requiresApproval ? 'PENDING_APPROVAL' : 'ENROLLED',
          progress_percent: 0,
          mandatory: false,
          manager_assigned: false,
          due_date: null,
          enrolled_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
        }),
      });
    });

    // 8. My Learning List — reflects lesson-progress updates recorded via route #7b below.
    let learnerCourseProgressPercent = 0;
    await page.route(/\/(?:api\/)?v1\/learner\/my-learning(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          courses: [
            {
              course_code: 'CRS-JAVA-001',
              title: 'Spring Boot 4 Architecture & Design',
              progress_percent: learnerCourseProgressPercent,
              status: learnerCourseProgressPercent >= 100 ? 'COMPLETED' : 'ENROLLED',
            },
          ],
        }),
      });
    });

    // 7b. Lesson Progress Tracking POST
    await page.route(/\/(?:api\/)?v1\/learner\/courses\/[^/]+\/progress(?:\?.*)?$/, async (r) => {
      const body = r.request().postDataJSON() as { progress_percent?: number } | null;
      learnerCourseProgressPercent = body?.progress_percent ?? Math.min(100, learnerCourseProgressPercent + 50);
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          course_code: 'CRS-JAVA-001',
          progress_percent: learnerCourseProgressPercent,
          status: learnerCourseProgressPercent >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
        }),
      });
    });

    // 9. Manager Hub & Team Overview — real contract per frontend/apps/lxp-app/src/hooks/
    // useManagerDashboardQuery.ts: the team dashboard page (WidgetBoard) queries the MERGED
    // endpoint (ManagerDashboardMerged = { hub: ManagerHubDashboard, legacy: ManagerDashboardSummary }),
    // not a single "team-dashboard" endpoint. ManagerDashboardSummary.at_risk_members carries
    // real per-member display names (ManagerAtRiskMember).
    await page.route(/\/(?:api\/)?v1\/manager\/dashboard\/merged(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hub: {
            manager_user_code: 'USR-E2E-MANAGER',
            pending_approvals: 1,
            submitted_requests: 2,
            can_view_team_pulse: true,
          },
          legacy: {
            manager_user_code: 'USR-E2E-MANAGER',
            team_size: 5,
            pending_approvals: 1,
            submitted_requests: 2,
            overdue_milestones: 0,
            active_journeys: 3,
            compliance_percent: 92,
            can_view_team_pulse: true,
            can_view_budget: false,
            can_allocate_budget: false,
            team_budget: null,
            kpi_tiles: [
              { code: 'TEAM_SIZE', label: 'Team Size', value: '5', trend: null, href: '' },
              { code: 'COMPLIANCE', label: 'Compliance', value: '92%', trend: 'up', href: '' },
            ],
            at_risk_members: [
              {
                user_code: 'USR-E2E-LEARNER',
                display_name: 'Alex Mercer',
                overdue_count: 0,
                compliance_percent: 88,
                active_enrollments: 1,
                drill_in_href: '',
              },
            ],
            executive_insight: 'Team compliance trending upward this quarter.',
            stakeholder_signals: [],
            captured_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route(/\/(?:api\/)?v1\/manager\/stakeholder-intelligence(?:\?.*)?$/, async (r) => {
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route(/\/(?:api\/)?v1\/manager\/hub\/at-risk(?:\?.*)?$/, async (r) => {
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    // Real endpoint is `/v1/users/me/dashboard-layout/:persona` (dashboardLayout.ts
    // `userDashboardLayoutPath`) — this regex's `$` anchor previously landed right after
    // 'dashboard-layout', never matching the required `/:persona` segment. The real request
    // (e.g. `/v1/users/me/dashboard-layout/learner`) fell through entirely unmocked, hit Vite's
    // dev proxy, and got retried repeatedly by `fetchWithAuth`'s built-in exponential backoff —
    // the actual root cause behind TC-PRF-001's wildly inflated "slow request" counts.
    // `fetchUserDashboardLayout()` treats a real 404 as "no saved layout" (returns null, no
    // error/retry), so a plain 404 here is the correct, simplest real response — no layout has
    // been customized for this synthetic E2E persona.
    await page.route(/\/(?:api\/)?v1\/users\/me\/dashboard-layout\/[^/]+(?:\?.*)?$/, async (r) => {
      await r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({}) });
    });

    // 10. Admin User Directory — real contract is a bare UserProfile[] array (see
    // frontend/packages/api-client/src/index.ts `fetchUsers`/`fetchAdminUsersSearch`),
    // not an object wrapper. A wrapped shape here crashes admin's <Table> (`sorted.slice
    // is not a function`) because it receives an object where it expects an array.
    const ADMIN_USER_PROFILES = [
      {
        user_code: 'USR-E2E-LEARNER',
        email: 'learner@example.test',
        first_name: 'Alex',
        last_name: 'Mercer',
        department_code: 'ENGINEERING',
        job_role_code: 'FULL_STACK_ENGINEER',
        user_status: 'ACTIVE',
      },
      {
        user_code: 'USR-E2E-MANAGER',
        email: 'manager@example.test',
        first_name: 'Jordan',
        last_name: 'Lee',
        department_code: 'ENGINEERING',
        job_role_code: 'ENGINEERING_MANAGER',
        user_status: 'ACTIVE',
      },
    ];
    await page.route(/\/(?:api\/)?v1\/admin\/users\/search(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ADMIN_USER_PROFILES),
      });
    });
    await page.route(/\/(?:api\/)?v1\/admin\/users(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ADMIN_USER_PROFILES),
      });
    });

    // 11a. Job-role search — real endpoint is TAXONOMY_PATHS.JOB_ROLES_SEARCH
    // ('/v1/taxonomy/job-roles/search'), consumed by JobRolePicker.tsx which maps
    // `row.job_role_code` / `row.label` / `row.track_label`. The reused
    // `installTaxonomyApiMocks` bridge (frontend/apps/admin/e2e/taxonomyApiMocks.ts) returns a
    // stale `code` field instead of `job_role_code` for this exact endpoint, which would leave
    // JobRolePicker's `value` undefined for every option — so this route is registered after
    // `installAdminMocks()` runs (Playwright matches the most-recently-registered handler first)
    // to override it with the real field name the picker actually reads.
    await page.route(/\/(?:api\/)?v1\/taxonomy\/job-roles\/search(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            job_role_code: 'ROLE-ARCH-PRINCIPAL',
            label: 'Senior Principal Architect',
            track_label: 'Engineering',
          },
        ]),
      });
    });

    // 11b. Learner Skill Gap Analysis — real endpoint is SKILL_GAPS
    // ('/v1/learner/skill-gaps/compare/:targetRoleCode'), not '/v1/learner/skills/gap-analysis'.
    // Real response shape is the `SkillGapCompare` type (frontend/packages/api-client/src/index.ts):
    // {user_code, target_role_code, current_role_code, readiness_percent, met, developing,
    // critical, generated_at} — each bucket a `SkillGapEntry[]` with a real `severity` field, not
    // the flat invented `{target_role, gaps: [...]}` shape this mock previously returned.
    await page.route(/\/(?:api\/)?v1\/learner\/skill-gaps\/compare\/[^/]+(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_code: 'USR-E2E-LEARNER',
          target_role_code: 'ROLE-ARCH-PRINCIPAL',
          current_role_code: null,
          readiness_percent: 42,
          met: [
            {
              skill_code: 'SKL-COMM-01',
              skill_name: 'Technical Communication',
              current_level: 4,
              target_level: 4,
              gap: 0,
              severity: 'MET',
              importance: 'CORE',
            },
          ],
          developing: [
            {
              skill_code: 'SKL-SEC-02',
              skill_name: 'Zero Trust & Envelope Encryption',
              current_level: 2,
              target_level: 4,
              gap: 2,
              severity: 'DEVELOPING',
              importance: 'CORE',
            },
          ],
          critical: [
            {
              skill_code: 'SKL-ARCH-01',
              skill_name: 'Reactive Distributed Systems',
              current_level: 3,
              target_level: 5,
              gap: 2,
              severity: 'CRITICAL',
              importance: 'CORE',
            },
          ],
          generated_at: '2026-09-01T00:00:00Z',
        }),
      });
    });

    // 12. Manager Workflow Approval Inbox — real component is WorkflowInbox.tsx, which calls
    // `getPendingSteps()` (GET WORKFLOW_PENDING = '/v1/workflows/pending', returning a bare
    // PendingStepDto[], not a wrapped '/v1/workflows/inbox' {total, tasks} shape) and filters
    // client-side by MANAGER_WORKFLOW_CODES. One LEARNING_REQUEST_APPROVAL step is seeded here —
    // its `entity_ref` uses the real raw snake_case fields the component's own parser reads
    // (`learner_user_code`, `course_code`), not the invented flat 'title'/'requester_user_code'
    // shape the old mock used. Decision submission is real `decideOnStep()`
    // (POST '/v1/workflows/:instanceCode/steps/:stepKey/decide'), not
    // '/v1/workflows/tasks/:id/approve'.
    let pendingWorkflowSteps = [
      {
        instance_code: 'WFI-E2E-001',
        step_key: 'STEP-MANAGER-APPROVAL',
        step_name: 'Approve learning request — Spring Boot 4 Architecture & Design',
        activity_type: 'HUMAN_APPROVAL',
        workflow_code: 'LEARNING_REQUEST_APPROVAL',
        entity_type: 'LEARNING_REQUEST',
        entity_id: 'LRQ-E2E-001',
        due_at: null,
        is_escalated: false,
        activated_at: '2026-09-01T00:00:00Z',
        business_key: 'LRQ-E2E-001',
        entity_ref: {
          learner_user_code: 'USR-E2E-LEARNER',
          course_code: 'CRS-JAVA-001',
          request_code: 'LRQ-E2E-001',
          justification: 'Required for the Q4 platform migration workstream.',
        },
      },
    ];
    await page.route(/\/(?:api\/)?v1\/workflows\/pending(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pendingWorkflowSteps),
      });
    });

    await page.route(
      /\/(?:api\/)?v1\/workflows\/[^/]+\/steps\/[^/]+\/decide(?:\?.*)?$/,
      async (r) => {
        const url = r.request().url();
        const match = url.match(/\/workflows\/([^/]+)\/steps\/([^/]+)\/decide/);
        const [, instanceCode, stepKey] = match ?? [];
        pendingWorkflowSteps = pendingWorkflowSteps.filter(
          (step) => !(step.instance_code === instanceCode && step.step_key === stepKey),
        );
        await r.fulfill({ status: 204, body: '' });
      },
    );

    // 13. Admin Content Governance — real component is ContentReviewGrid.tsx
    // (frontend/apps/admin/src/components/content-review/ContentReviewGrid.tsx), which calls
    // `searchContentGovernanceQueue()` (GET '/v1/workspaces/:id/content-governance/queue/search')
    // and `fetchContentGovernanceMetrics()` (GET '/v1/workspaces/:id/content-governance/metrics')
    // — completely different paths/shapes than the invented '/v1/admin/content' this mock used to
    // intercept. Real `ContentQueueItem`/`ContentGovernanceMetrics` shapes below.
    //
    // Note: there is no real "tenant settings/branding" page anywhere in the admin app —
    // `ROUTES.SETTINGS` ('/admin/settings') is declared in `@bien/routes` but never mounted in
    // `AppRouter.tsx` (only the unrelated `HOST_ROUTES.SETTINGS`, a host-operator page, is
    // mounted). `TenantSettingsPage`/its `/v1/admin/settings` mock were both fabricated with no
    // real counterpart — removed rather than left pointing at a route/endpoint that doesn't exist.
    await page.route(
      /\/(?:api\/)?v1\/workspaces\/[^/]+\/content-governance\/queue\/search(?:\?.*)?$/,
      async (r) => {
        await r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                source_code: 'CGS-001',
                provider_id: 'PRV-001',
                external_course_id: 'Spring Boot 4 Architecture & Design',
                source_url: 'https://provider.example.test/courses/spring-boot-4',
                governance_status: 'PENDING_REVIEW',
                ingestion_status: 'INGESTED',
                lxp_course_code: 'CRS-JAVA-001',
                quality_score: 92,
                created_at: '2026-09-01T00:00:00Z',
                captions_ready: true,
                captions_required: false,
              },
            ],
            total: 1,
            page: 0,
            page_size: 25,
          }),
        });
      },
    );

    await page.route(
      /\/(?:api\/)?v1\/workspaces\/[^/]+\/content-governance\/metrics(?:\?.*)?$/,
      async (r) => {
        await r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            pending_review_count: 1,
            approved_this_week: 4,
            rejected_this_week: 0,
            auto_approved_this_week: 2,
            pending_by_provider: { 'PRV-001': 1 },
          }),
        });
      },
    );

    // 14. Assessment Runner — real component is AssessmentPlayer.tsx, which calls
    // `startAssessmentAttempt()` (POST API_PATHS.ASSESSMENT_ATTEMPTS = '/v1/assessments/attempts',
    // not '/v1/assessment/runner/:id') expecting a real AssessmentAttemptState back
    // ({attempt_code, template_code, status, player_settings, questions: AssessmentAttemptQuestion[]}
    // — question fields are `id`/`stem`/`type`/`options`/`points`, not `question_code`/`prompt`).
    // A start-call failure (wrong URL/shape) renders only an AlertBanner error, with no quiz UI
    // and therefore no submit control ever appearing — exactly what the old mock caused.
    const ASSESSMENT_ATTEMPT_CODE = 'ATT-E2E-001';
    await page.route(/\/(?:api\/)?v1\/assessments\/attempts(?:\?.*)?$/, async (r) => {
      if (r.request().method() !== 'POST') {
        await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        return;
      }
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          attempt_code: ASSESSMENT_ATTEMPT_CODE,
          template_code: 'ASM-E2E-001',
          status: 'IN_PROGRESS',
          preview_mode: false,
          expires_at: null,
          saved_answers: {},
          player_settings: {
            player_mode: 'ALL_AT_ONCE',
            prevent_copy_paste: false,
            require_fullscreen: false,
            max_tab_blur_before_flag: 0,
          },
          questions: [
            {
              id: 'Q-001',
              type: 'MULTIPLE_CHOICE',
              stem: 'Which annotation declares a Spring Modulith module boundary?',
              options: ['@Module', '@ApplicationModule', '@Boundary', '@Component'],
              points: 10,
            },
          ],
        }),
      });
    });

    await page.route(
      /\/(?:api\/)?v1\/assessments\/attempts\/[^/]+\/submit(?:\?.*)?$/,
      async (r) => {
        await r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            attempt_code: ASSESSMENT_ATTEMPT_CODE,
            template_code: 'ASM-E2E-001',
            status: 'GRADED',
            score_percent: 100,
            passed: true,
          }),
        });
      },
    );

    // Fire-and-forget calls the real player also makes (autosave every answer-change, a 30s
    // heartbeat, and integrity events) — each is wrapped in a silent `.catch()` in the real
    // component, but mocking them for real keeps the network log clean and matches production
    // contract shape rather than leaving them to 404.
    await page.route(
      /\/(?:api\/)?v1\/assessments\/attempts\/[^/]+\/autosave(?:\?.*)?$/,
      async (r) => {
        await r.fulfill({ status: 204, body: '' });
      },
    );
    await page.route(
      /\/(?:api\/)?v1\/assessments\/attempts\/[^/]+\/heartbeat(?:\?.*)?$/,
      async (r) => {
        await r.fulfill({ status: 204, body: '' });
      },
    );
    await page.route(
      /\/(?:api\/)?v1\/assessments\/attempts\/[^/]+\/integrity-events(?:\?.*)?$/,
      async (r) => {
        await r.fulfill({ status: 204, body: '' });
      },
    );

    // 15. Executive Report Exports — real contract per
    // frontend/packages/api-client/src/executiveExportApi.ts: GET/POST both hit
    // /v1/admin/analytics/exports (ADMIN_EXECUTIVE_EXPORTS), returning/consuming a bare
    // ExecutiveReportExport[] / one ExecutiveReportExport respectively.
    interface ExecutiveExportRow {
      export_code: string;
      job_code: string;
      job_type: string;
      report_kind: string;
      status: string;
      file_code: string | null;
      file_name: string | null;
      requested_by: string | null;
      error_message: string | null;
      created_at: string;
      completed_at: string | null;
      can_download: boolean;
    }
    let executiveExportRows: ExecutiveExportRow[] = [
      {
        export_code: 'EXP-E2E-SUCCESS-001',
        job_code: 'JOB-E2E-001',
        job_type: 'EXECUTIVE_EXPORT',
        report_kind: 'GOVERNANCE',
        status: 'SUCCEEDED',
        file_code: 'FILE-E2E-001',
        file_name: 'governance-export.xlsx',
        requested_by: 'USR-E2E-HOST',
        error_message: null,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        can_download: true,
      },
    ];
    await page.route(/\/(?:api\/)?v1\/admin\/analytics\/exports(?:\?.*)?$/, async (r) => {
      if (r.request().method() === 'POST') {
        const body = r.request().postDataJSON() as { report_kind?: string } | null;
        const newRow = {
          export_code: `EXP-E2E-${Date.now()}`,
          job_code: `JOB-E2E-${Date.now()}`,
          job_type: 'EXECUTIVE_EXPORT',
          report_kind: body?.report_kind ?? 'GOVERNANCE',
          status: 'PENDING',
          file_code: null,
          file_name: null,
          requested_by: 'USR-E2E-HOST',
          error_message: null,
          created_at: new Date().toISOString(),
          completed_at: null,
          can_download: false,
        };
        executiveExportRows = [newRow, ...executiveExportRows];
        await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(newRow) });
        return;
      }
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(executiveExportRows),
      });
    });

    // 15b. Miscellaneous cross-cutting endpoints called on most authenticated pages —
    // mocked with harmless defaults so the app doesn't 502 through Vite's dev proxy
    // to a backend that isn't running under E2E_API_MODE=mock.
    await page.route(/\/(?:api\/)?v1\/learner\/date-format-prefs(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ date_format: 'MM/DD/YYYY', time_format: '12H', timezone: 'UTC' }),
      });
    });

    await page.route(/\/(?:api\/)?v1\/users\/me\/dashboard-tabs\/[^/]+(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tabs: [{ tab_code: 'TAB-DEFAULT', label: 'Overview', is_default: true }] }),
      });
    });

    await page.route(/\/(?:api\/)?v1\/admin\/tenant\/dashboard-preset\/[^/]+(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ preset_code: 'PRESET-DEFAULT', widgets: [] }),
      });
    });

    await page.route(/\/(?:api\/)?v1\/manager\/hub\/assessments\/summary(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total_assigned: 0, total_completed: 0, average_score_percent: 0 }),
      });
    });

    // Real contract: authGet<{ features: WorkspaceAssessmentFeatures }>(...).then(p => p.features)
    // — frontend/packages/api-client/src/index.ts `fetchWorkspaceAssessmentFeatures`. The learner
    // assessment routes gate on `features.ADVANCED_ASSESSMENTS === true`
    // (frontend/apps/lxp-app/src/hooks/useAdvancedAssessments.ts) — without this exact key/shape,
    // RequireAdvancedAssessments redirects every assessment route back to /learner/home.
    await page.route(/\/(?:api\/)?v1\/admin\/assessments\/features(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          features: {
            ADVANCED_ASSESSMENTS: true,
            AI_AUTHORING: false,
            PROCTORING: false,
          },
        }),
      });
    });

    // 16. Gamification Profile — real shape is GamificationProfile (frontend/packages/
    // api-client/src/index.ts): points/level/points_to_next_level/workspace_rank/streak_days/
    // badges_earned/recent_badges: GamificationBadge[] (each just {name, earned_at_label}).
    await page.route(/\/(?:api\/)?v1\/learner\/gamification\/profile(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          points: 1250,
          level: 3,
          points_to_next_level: 250,
          workspace_rank: 4,
          streak_days: 7,
          badges_earned: 2,
          recent_badges: [
            { name: 'First Course Completed', earned_at_label: 'Today' },
            { name: '7-Day Streak', earned_at_label: 'Today' },
          ],
        }),
      });
    });

    // 16b. Gamification Leaderboard — real endpoint `fetchGamificationLeaderboard()`
    // (GET '/v1/learner/gamification/leaderboard?limit=N'), returning a bare `LeaderboardEntry[]`.
    // This was entirely unmocked, so `AchievementsPage.tsx`'s `loadGamificationLeaderboard()` call
    // (fetched alongside the profile) always failed and the real page rendered its
    // "We could not load this content" error state instead of any KPI/badge content.
    await page.route(/\/(?:api\/)?v1\/learner\/gamification\/leaderboard(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { rank: 1, user_code: 'USR-E2E-PEER-1', display_name: 'Alex Mercer', points: 2100, is_current_user: false },
          { rank: 2, user_code: 'USR-E2E-LEARNER', display_name: 'Demo Learner', points: 1250, is_current_user: true },
        ]),
      });
    });

    // 17. Community Spaces & Threads — real contract is a bare CommunitySpace[]/CommunityThread[]
    // array (frontend/packages/api-client/src/index.ts `fetchLearnerCommunitySpaces`/
    // `listCommunityThreads`), not wrapped in {spaces: [...]}.
    await page.route(/\/(?:api\/)?v1\/learner\/community\/spaces(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            space_code: 'SPC-ENGINEERING',
            name: 'Engineering Guild',
            description: 'A space for engineering discussions',
            space_type: 'PUBLIC',
            member_count: 84,
            post_count: 12,
            last_activity_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route(/\/(?:api\/)?v1\/learner\/community\/spaces\/[^/]+\/threads(?:\?.*)?$/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            thread_code: 'THR-E2E-001',
            space_code: 'SPC-ENGINEERING',
            title: 'Best practices for Spring Modulith boundaries?',
            body_text: 'What conventions do you use for module boundaries?',
            thread_type: 'DISCUSSION',
            status: 'OPEN',
            reply_count: 3,
            author_user_code: 'USR-E2E-MANAGER',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

  }
}
