import { test } from '@playwright/test';

export async function Given<T>(description: string, stepFn: () => Promise<T>): Promise<T> {
  return test.step(`[GIVEN] ${description}`, stepFn);
}

export async function When<T>(description: string, stepFn: () => Promise<T>): Promise<T> {
  return test.step(`[WHEN] ${description}`, stepFn);
}

export async function Then<T>(description: string, stepFn: () => Promise<T>): Promise<T> {
  return test.step(`[THEN] ${description}`, stepFn);
}

export async function And<T>(description: string, stepFn: () => Promise<T>): Promise<T> {
  return test.step(`[AND] ${description}`, stepFn);
}
