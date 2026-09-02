export interface FlakyRecord {
  testTitle: string;
  testFile: string;
  retryCount: number;
  lastFailureDate: string;
  quarantined: boolean;
}

export class FlakyQuarantineManager {
  private static quarantinedTests = new Set<string>();

  static quarantine(testTitle: string): void {
    this.quarantinedTests.add(testTitle);
  }

  static isQuarantined(testTitle: string): boolean {
    return this.quarantinedTests.has(testTitle);
  }
}
