export abstract class BaseFactory<TEntity, TCreateInput = Partial<TEntity>> {
  abstract build(overrides?: TCreateInput): TEntity;
  abstract create(overrides?: TCreateInput): Promise<TEntity>;
}

export class CleanupRegistry {
  private cleanups: Array<() => Promise<void>> = [];

  register(cleanupFn: () => Promise<void>): void {
    this.cleanups.push(cleanupFn);
  }

  async executeAll(): Promise<void> {
    while (this.cleanups.length > 0) {
      const fn = this.cleanups.pop();
      try {
        if (fn) await fn();
      } catch (err) {
        console.warn('[WARN] Cleanup error:', err);
      }
    }
  }
}
