import { expect, test } from 'vitest';
import { canTeach, isDoubleBooked, isOverCapacity } from './warnings';
import { satoTue } from './fixtures';
import type { Placement } from './types';

const mk = (n: number, teacherId = 't1'): Placement[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, date: '2026-08-04', periodId: 'p1', teacherId, studentId: `s${i}`, subject: '数学' }));

test('4人は超過ではない、5人は超過', () => {
  expect(isOverCapacity(mk(4), '2026-08-04', 'p1', 't1')).toBe(false);
  expect(isOverCapacity(mk(5), '2026-08-04', 'p1', 't1')).toBe(true);
});

test('他の先生・他のコマの生徒は数えない', () => {
  expect(isOverCapacity([...mk(4), ...mk(3, 't2')], '2026-08-04', 'p1', 't1')).toBe(false);
});

test('担当外の科目・学年は false', () => {
  expect(canTeach(satoTue, '中2', '数学')).toBe(true);
  expect(canTeach(satoTue, '中2', '国語')).toBe(false);
  expect(canTeach(satoTue, '高1', '数学')).toBe(false);
});

test('同じ日・同じコマに既にいれば二重配置、自分自身は除く', () => {
  const ps = mk(2);
  expect(isDoubleBooked(ps, '2026-08-04', 'p1', 's0')).toBe(true);
  expect(isDoubleBooked(ps, '2026-08-04', 'p1', 's0', 'p0')).toBe(false);
  expect(isDoubleBooked(ps, '2026-08-04', 'p2', 's0')).toBe(false);
});
