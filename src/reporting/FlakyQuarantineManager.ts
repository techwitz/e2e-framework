import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface FlakyRecord {
  testTitle: string;
  testFile: string;
  retryCount: number;
  lastFailureDate: string;
  quarantined: boolean;
}

/**
 * Tracks tests that only pass after one or more retries (Playwright's own signal for
 * flakiness: `test.results.length > 1` with a final `passed` status). Persists to a JSON
 * file across runs so flakiness is visible over time, not just within a single execution —
 * a test that's flaky once is noise; a test that's flaky on 5 of the last 10 runs is a real
 * quarantine candidate.
 */
export class FlakyQuarantineManager {
  private static records = new Map<string, FlakyRecord>();
  private static quarantineThreshold = 3;
  private static loaded = false;
  private static storePath = path.resolve(process.cwd(), '.flaky-quarantine.json');

  static configure(storePath: string, quarantineThreshold = 3): void {
    this.storePath = storePath;
    this.quarantineThreshold = quarantineThreshold;
  }

  private static key(testTitle: string, testFile: string): string {
    return `${testFile}::${testTitle}`;
  }

  static async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = await fs.readFile(this.storePath, 'utf-8');
      const parsed: FlakyRecord[] = JSON.parse(raw);
      for (const rec of parsed) {
        this.records.set(this.key(rec.testTitle, rec.testFile), rec);
      }
    } catch {
      // no store yet — first run, or file unreadable; start clean
    }
  }

  /** Called once per test that ended up `passed` after 1+ retries. */
  static recordFlake(testTitle: string, testFile: string): FlakyRecord {
    const k = this.key(testTitle, testFile);
    const existing = this.records.get(k);
    const record: FlakyRecord = {
      testTitle,
      testFile,
      retryCount: (existing?.retryCount ?? 0) + 1,
      lastFailureDate: new Date().toISOString(),
      quarantined: (existing?.retryCount ?? 0) + 1 >= this.quarantineThreshold,
    };
    this.records.set(k, record);
    return record;
  }

  static isQuarantined(testTitle: string, testFile: string): boolean {
    return this.records.get(this.key(testTitle, testFile))?.quarantined ?? false;
  }

  static getAll(): FlakyRecord[] {
    return [...this.records.values()].sort((a, b) => b.retryCount - a.retryCount);
  }

  static async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    await fs.writeFile(this.storePath, JSON.stringify(this.getAll(), null, 2), 'utf-8');
  }

  /** Test-only / process-lifetime reset. */
  static reset(): void {
    this.records.clear();
    this.loaded = false;
  }
}
