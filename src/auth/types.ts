/**
 * Generic, product-agnostic session seed. `TState` is whatever shape the
 * consuming app's own client-side auth store expects — this package has no
 * opinion on it and never inspects it, only JSON.stringify()s it.
 */
export interface AuthStorageSeed<TState = unknown> {
  /** Every localStorage key this state should be written under (usually just one). */
  storageKeys: string[];
  state: TState;
}
