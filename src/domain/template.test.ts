import { describe, expect, it } from 'vitest';
import { templateToPlacements } from './template';
import { regular, satoTue, summer } from './fixtures';
import type { Availability, TemplateSlot } from './types';

const tue: TemplateSlot = { id: 'a', weekday: 2, periodId: 'p1', teacherId: 't1', studentId: 's1', subject: '数学' };
const tue2: TemplateSlot = { ...tue, id: 'b', studentId: 's2', subject: '英語' };
const wed: TemplateSlot = { ...tue, id: 'c', weekday: 3 };
const DATE = '2026-11-10'; // 火曜

describe('templateToPlacements', () => {
  it('通常期はその曜日のスロットを日付付きで返す', () => {
    expect(templateToPlacements([tue, wed], DATE, regular, [satoTue], [])).toEqual([
      { date: DATE, periodId: 'p1', teacherId: 't1', studentId: 's1', subject: '数学' },
    ]);
  });
  it('講習期間や期間外は空', () => {
    expect(templateToPlacements([tue], '2026-08-04', summer, [satoTue], [])).toEqual([]);
    expect(templateToPlacements([tue], DATE, null, [satoTue], [])).toEqual([]);
  });
  it('来られない生徒の行は除く', () => {
    const av: Availability[] = [{ termId: 'r', personType: 'student', personId: 's1', date: DATE, available: false }];
    expect(templateToPlacements([tue, tue2], DATE, regular, [satoTue], av).map((p) => p.studentId)).toEqual(['s2']);
  });
  it('来られない先生・その曜日に来ない先生の行は除く', () => {
    const av: Availability[] = [{ termId: 'r', personType: 'teacher', personId: 't1', date: DATE, available: false }];
    expect(templateToPlacements([tue], DATE, regular, [satoTue], av)).toEqual([]);
    expect(templateToPlacements([tue], DATE, regular, [{ ...satoTue, weekdays: [1] }], [])).toEqual([]);
  });
});
