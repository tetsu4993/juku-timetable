import { expect, test } from 'vitest';
import { subjectsLeftToday } from './pool';
import { regular, summer, tanakaTue } from './fixtures';
import type { Enrollment, Placement, Student } from './types';

const twoOnTue: Student = { ...tanakaTue, regular: [{ weekday: 2, subject: '数学' }, { weekday: 2, subject: '英語' }] };
const placed = (subject: '数学' | '英語', date = '2026-11-10'): Placement =>
  ({ id: `p-${subject}-${date}`, date, periodId: 'p1', teacherId: 't1', studentId: 's1', subject });

test('通常期：その日すでに配置した科目は残りから外れる', () => {
  expect(subjectsLeftToday(twoOnTue, '2026-11-10', regular, [], [placed('数学')])).toEqual(['英語']);
  expect(subjectsLeftToday(twoOnTue, '2026-11-10', regular, [], [placed('数学'), placed('英語')])).toEqual([]);
});

test('講習期：残りコマがある間は同じ日に複数コマ配置できる', () => {
  const enr: Enrollment[] = [{ termId: 'k', studentId: 's1', subject: '数学', count: 3 }];
  const ps = [placed('数学', '2026-08-04')];
  expect(subjectsLeftToday(tanakaTue, '2026-08-04', summer, enr, ps)).toEqual(['数学']);
});

test('講習期：申込を使い切ったら空', () => {
  const enr: Enrollment[] = [{ termId: 'k', studentId: 's1', subject: '数学', count: 1 }];
  expect(subjectsLeftToday(tanakaTue, '2026-08-04', summer, enr, [placed('数学', '2026-08-01')])).toEqual([]);
});
