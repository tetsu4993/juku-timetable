import { describe, expect, test } from 'vitest';
import { isFullyPlaced, remainingBySubject, selectableSubjects } from './remaining';
import { itoWed, regular, summer, tanakaTue } from './fixtures';
import type { Enrollment, Placement, Subject } from './types';

const enr: Enrollment[] = [
  { termId: 'k', studentId: 's1', subject: '数学', count: 10 },
  { termId: 'k', studentId: 's1', subject: '英語', count: 8 },
];
const p = (date: string, subject: Subject, i: number): Placement =>
  ({ id: `p${i}`, date, periodId: 'p1', teacherId: 't1', studentId: 's1', subject });

describe('remainingBySubject', () => {
  test('数学10・英語8で数学を3配置 → 数学7・英語8', () => {
    const ps = [1, 2, 3].map((i) => p(`2026-08-0${i}`, '数学', i));
    expect(remainingBySubject('s1', summer, enr, ps)).toEqual({ 数学: 7, 英語: 8 });
  });
  test('期間外の配置は数えない', () => {
    expect(remainingBySubject('s1', summer, enr, [p('2026-11-10', '数学', 1)])).toEqual({ 数学: 10, 英語: 8 });
  });
  test('申込より多く配置されても 0 で止まる', () => {
    const one: Enrollment[] = [{ termId: 'k', studentId: 's1', subject: '数学', count: 1 }];
    const ps = [p('2026-08-01', '数学', 1), p('2026-08-02', '数学', 2)];
    expect(remainingBySubject('s1', summer, one, ps)).toEqual({ 数学: 0 });
  });
});

describe('isFullyPlaced / selectableSubjects', () => {
  const one: Enrollment[] = [{ termId: 'k', studentId: 's1', subject: '数学', count: 1 }];
  const ps = [p('2026-08-01', '数学', 1)];
  test('全科目0なら配置済み・選べる科目なし', () => {
    expect(isFullyPlaced('s1', summer, one, ps)).toBe(true);
    expect(selectableSubjects(tanakaTue, '2026-08-04', summer, one, ps)).toEqual([]);
  });
  test('講習期は残りがある科目だけ', () => {
    expect(selectableSubjects(tanakaTue, '2026-08-04', summer, enr, [p('2026-08-01', '数学', 1)])).toEqual(['数学', '英語']);
    expect(isFullyPlaced('s1', summer, enr, [])).toBe(false);
  });
  test('通常期はその曜日の受講科目', () => {
    expect(selectableSubjects(tanakaTue, '2026-11-10', regular, [], [])).toEqual(['数学']);
  });
  test('通常期で曜日の受講がなければ受講科目すべて（重複なし）', () => {
    expect(selectableSubjects(itoWed, '2026-11-10', regular, [], [])).toEqual(['英語', '国語']);
  });
});
