export interface K6Stage {
  duration: string;
  target: number;
}

export interface K6ScenarioConfig {
  scenarioName: string;
  endpointUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: Record<string, unknown>;
  stages?: K6Stage[];
  p95ThresholdMs?: number;
  /** Fallback base URL used only when the k6 run doesn't set __ENV.API_BASE_URL. */
  fallbackBaseUrl?: string;
  /** Extra static headers to send with every request (e.g. a tenant/workspace id header). */
  extraHeaders?: Record<string, string>;
}

export class K6ScenarioGenerator {
  static generateScript(config: K6ScenarioConfig): string {
    const stages = config.stages ?? [
      { duration: '30s', target: 20 },
      { duration: '1m', target: 20 },
      { duration: '30s', target: 0 },
    ];
    const threshold = config.p95ThresholdMs ?? 500;
    const fallbackBaseUrl = config.fallbackBaseUrl ?? 'http://localhost:8080';
    const extraHeaders = Object.entries(config.extraHeaders ?? {})
      .map(([key, value]) => `      '${key}': '${value}',`)
      .join('\n');

    return `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: ${JSON.stringify(stages, null, 4)},
  thresholds: {
    http_req_duration: ['p(95)<${threshold}'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const url = __ENV.API_BASE_URL ? __ENV.API_BASE_URL + '${config.endpointUrl}' : '${fallbackBaseUrl}${config.endpointUrl}';
  const params = {
    headers: {
      'Authorization': 'Bearer ' + (__ENV.E2E_JWT_TOKEN || ''),
      'Content-Type': 'application/json',
${extraHeaders}
    },
  };

  ${
    config.method === 'GET'
      ? `const res = http.get(url, params);`
      : `const payload = JSON.stringify(${JSON.stringify(config.payload ?? {})});
  const res = http.${config.method.toLowerCase()}(url, payload, params);`
  }

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  sleep(1);
}
`;
  }
}
