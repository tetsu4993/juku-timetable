import { describe, expect, test } from 'vitest';
import { studentsForDate, teachersForDate, termForDate } from './attendance';
import { itoWed, regular, satoTue, summer, suzukiMon, tanakaTue } from './fixtures';
import type { Availability, Enrollment } from './types';

describe('termForDate', () => {
  test('講習と通常期が重なれば講習を返す', () => {
    expect(termForDate([regular, summer], '2026-08-04')).toBe(summer);
  });
  test('講習外は通常期', () => {
    expect(termForDate([regular, summer], '2026-11-10')).toBe(regular);
  });
  test('範囲外は null', () => {
    expect(termForDate([regular, summer], '2028-01-01')).toBeNull();
  });
});

describe('teachersForDate', () => {
  test('通常期の火曜は weekdays に 2 を含む先生だけ', () => {
    expect(teachersForDate([satoTue, suzukiMon], '2026-11-10', regular, [])).toEqual([satoTue]);
  });
  test('available=false の先生は除外、available=true は曜日外でも追加', () => {
    const avail: Availability[] = [
      { termId: 'k', personType: 'teacher', personId: 't1', date: '2026-08-04', available: false },
      { termId: 'k', personType: 'teacher', personId: 't2', date: '2026-08-04', available: true },
    ];
    expect(teachersForDate([satoTue, suzukiMon], '2026-08-04', summer, avail)).toEqual([suzukiMon]);
  });
});

describe('studentsForDate', () => {
  test('通常期は受講曜日の生徒', () => {
    expect(studentsForDate([tanakaTue, itoWed], '2026-11-10', regular, [], [], [])).toEqual([tanakaTue]);
  });
  test('講習期は申込のある生徒が曜日に関係なく返り、申込なしは返らない', () => {
    const enr: Enrollment[] = [{ termId: 'k', studentId: 's2', subject: '英語', count: 5 }];
    expect(studentsForDate([tanakaTue, itoWed], '2026-08-04', summer, enr, [], [])).toEqual([itoWed]);
  });
  test('available=false の生徒は除外', () => {
    const enr: Enrollment[] = [{ termId: 'k', studentId: 's2', subject: '英語', count: 5 }];
    const avail: Availability[] = [{ termId: 'k', personType: 'student', personId: 's2', date: '2026-08-04', available: false }];
    expect(studentsForDate([tanakaTue, itoWed], '2026-08-04', summer, enr, avail, [])).toEqual([]);
  });
  test('extras は曜日外でも返り、重複しない', () => {
    const extras = [{ date: '2026-11-10', studentId: 's2' }, { date: '2026-11-10', studentId: 's1' }];
    expect(studentsForDate([tanakaTue, itoWed], '2026-11-10', regular, [], [], extras)).toEqual([tanakaTue, itoWed]);
  });
});
