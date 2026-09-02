import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 30 },
    { duration: '1m', target: 30 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<750'],
    http_req_failed: ['rate<0.02'],
  },
};

export default function () {
  const baseUrl = __ENV.API_URL || 'http://127.0.0.1:30080';
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Workspace-Id': 'WS-DEMO',
      'Authorization': 'Bearer ' + (__ENV.E2E_JWT_TOKEN || ''),
    },
  };

  const payload = JSON.stringify({
    source: 'LOAD_TEST',
  });

  const res = http.post(`${baseUrl}/api/v1/learner/courses/CRS-JAVA-001/enroll`, payload, params);
  check(res, {
    'enrollment status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  sleep(1);
}
