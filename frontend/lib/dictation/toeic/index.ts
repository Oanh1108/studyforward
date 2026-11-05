import type { ToeicTest } from './types.ts';
import { toeic2024Test06 } from './2024-test-06.ts';
import { toeic2024Test05 } from './2024-test-05.ts';
import { toeic2024Test07 } from './2024-test-07.ts';
import { toeic2024Test04 } from './2024-test-04.ts';
import { toeic2024Test08 } from './2024-test-08.ts';
import { toeic2024Test03 } from './2024-test-03.ts';
import { toeic2024Test10 } from './2024-test-10.ts';
import { toeic2024Test09 } from './2024-test-09.ts';
import { toeic2024Test02 } from './2024-test-02.ts';
import { toeic2024Test01 } from './2024-test-01.ts';
import { toeic2023Test01 } from './2023-test-01.ts';
import { toeic2023Test02 } from './2023-test-02.ts';
import { toeic2023Test03 } from './2023-test-03.ts';
import { toeic2023Test04 } from './2023-test-04.ts';
import { toeic2023Test10 } from './2023-test-10.ts';
import { toeic2023Test06 } from './2023-test-06.ts';
import { toeic2023Test07 } from './2023-test-07.ts';
import { toeic2023Test09 } from './2023-test-09.ts';
import { toeic2023Test08 } from './2023-test-08.ts';
import { toeic2023Test05 } from './2023-test-05.ts';
import { toeic2026Test01 } from './2026-test-01.ts';
import { toeic2026Test02 } from './2026-test-02.ts';
import { toeic2026Test03 } from './2026-test-03.ts';
import { toeic2026Test04 } from './2026-test-04.ts';
import { toeic2026Test05 } from './2026-test-05.ts';
import { toeic2026Test06 } from './2026-test-06.ts';
import { toeic2026Test07 } from './2026-test-07.ts';
import { toeic2026Test08 } from './2026-test-08.ts';
import { toeic2026Test09 } from './2026-test-09.ts';
import { toeic2026Test10 } from './2026-test-10.ts';

/**
 * Every TOEIC test available for dictation. To add one: put its recordings in public/audio/toeic/<year>/test-<nn>/,
 * write its script in data/toeic/<year>/, run scripts/toeic/build-test.ts, and list the generated test here.
 */
export const TOEIC_TESTS: ToeicTest[] = [toeic2024Test06, toeic2024Test05, toeic2024Test07, toeic2024Test04, toeic2024Test08, toeic2024Test03, toeic2024Test10, toeic2024Test09, toeic2024Test02, toeic2024Test01, toeic2023Test01, toeic2023Test02, toeic2023Test03, toeic2023Test04, toeic2023Test10, toeic2023Test06, toeic2023Test07, toeic2023Test09, toeic2023Test08, toeic2023Test05, toeic2026Test01, toeic2026Test02, toeic2026Test03, toeic2026Test04, toeic2026Test05, toeic2026Test06, toeic2026Test07, toeic2026Test08, toeic2026Test09, toeic2026Test10];

export interface ToeicYear {
  year: number;
  tests: ToeicTest[];
}

/** Years newest first, each with its tests in order. */
export function toeicYears(tests: ToeicTest[] = TOEIC_TESTS): ToeicYear[] {
  const byYear = new Map<number, ToeicTest[]>();
  for (const t of tests) byYear.set(t.year, [...(byYear.get(t.year) ?? []), t]);
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({ year, tests: list.sort((a, b) => a.test - b.test) }));
}

export const findToeicTest = (id: string, tests: ToeicTest[] = TOEIC_TESTS) => tests.find((t) => t.id === id);

export * from './types.ts';
