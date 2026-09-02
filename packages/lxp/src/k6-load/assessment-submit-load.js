import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 25 },
    { duration: '45s', target: 25 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<600'],
    http_req_failed: ['rate<0.01'],
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
    answers: {
      'Q-01': 'A',
      'Q-02': 'C',
    },
  });

  const res = http.post(`${baseUrl}/api/v1/assessment/runner/ASM-E2E-001/submit`, payload, params);
  check(res, {
    'submission status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
