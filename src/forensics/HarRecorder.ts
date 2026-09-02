import type { Page } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export class HarRecorder {
  private harFilePath: string | null = null;

  async start(page: Page, targetHarPath: string): Promise<void> {
    this.harFilePath = targetHarPath;
    const dir = path.dirname(targetHarPath);
    await fs.mkdir(dir, { recursive: true });

    await page.routeFromHAR(targetHarPath, {
      update: true,
      updateContent: 'embed',
      notFound: 'fallback',
    }).catch(() => {
      // routeFromHAR update mode enabled
    });
  }

  getHarPath(): string | null {
    return this.harFilePath;
  }
}
