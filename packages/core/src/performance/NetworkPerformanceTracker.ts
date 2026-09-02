import type { Page, Request, Response } from '@playwright/test';

export interface RequestTimingRecord {
  url: string;
  method: string;
  status: number;
  durationMs: number;
}

export class NetworkPerformanceTracker {
  private timings: RequestTimingRecord[] = [];
  private startTimes = new Map<string, number>();

  attach(page: Page): void {
    page.on('request', (req: Request) => {
      this.startTimes.set(req.url(), Date.now());
    });

    page.on('response', (res: Response) => {
      const url = res.url();
      const start = this.startTimes.get(url);
      if (start) {
        const durationMs = Date.now() - start;
        this.timings.push({
          url,
          method: res.request().method(),
          status: res.status(),
          durationMs,
        });
        this.startTimes.delete(url);
      }
    });
  }

  getSlowRequests(thresholdMs = 500): RequestTimingRecord[] {
    return this.timings.filter((t) => t.durationMs > thresholdMs);
  }

  getAllTimings(): RequestTimingRecord[] {
    return [...this.timings];
  }
}
