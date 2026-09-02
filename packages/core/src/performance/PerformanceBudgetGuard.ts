export class PerformanceBudgetGuard {
  static assertBudget(
    metricName: string,
    actualValue: number,
    budgetLimit: number,
    unit = 'ms',
  ): void {
    if (actualValue > budgetLimit) {
      throw new Error(`[PerformanceBudgetGuard] Metric '${metricName}' exceeded budget: ${actualValue}${unit} > limit ${budgetLimit}${unit}`);
    }
  }
}
