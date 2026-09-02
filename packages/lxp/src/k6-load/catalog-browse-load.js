import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 20 },
    { duration: '40s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
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

  const res = http.get(`${baseUrl}/api/v1/catalog/courses?page=0&size=10`, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
