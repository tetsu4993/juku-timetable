import { describe, expect, it } from 'vitest';
import { duplicateIslands, filterStudents, fiscalYear, nextGrade, promotionDue } from './school-year';
import type { Student } from './types';

describe('nextGrade', () => {
  it.each([['小6', '中1'], ['中3', '高1'], ['高2', '高3'], ['高3', '卒業'], ['卒業', '卒業'], ['小1', '小2']] as const)(
    '%s → %s', (a, b) => expect(nextGrade(a)).toBe(b));
});

describe('fiscalYear / promotionDue', () => {
  it('4月始まりの年度', () => {
    expect(fiscalYear('2027-03-31')).toBe(2026);
    expect(fiscalYear('2027-04-01')).toBe(2027);
  });
  it('最後に繰り上げた年度より新しい年度なら true', () => {
    expect(promotionDue('2027-04-01', 2026)).toBe(true);
    expect(promotionDue('2027-03-31', 2026)).toBe(false);
    expect(promotionDue('2027-05-01', 2027)).toBe(false);
  });
  it('記録がない初回は「済み」とみなす', () => {
    expect(promotionDue('2027-04-01', null)).toBe(false);
  });
});

describe('duplicateIslands', () => {
  it('同じコマで同じ島を選んだ先生を返す', () => {
    const cells = [
      { periodId: 'p1', teacherId: 't1', islandId: 'A' },
      { periodId: 'p1', teacherId: 't2', islandId: 'A' },
      { periodId: 'p1', teacherId: 't3', islandId: 'B' },
      { periodId: 'p2', teacherId: 't4', islandId: 'A' },
    ];
    expect([...duplicateIslands(cells, 'p1')].sort()).toEqual(['t1', 't2']);
    expect(duplicateIslands(cells, 'p2').size).toBe(0);
  });
});

describe('filterStudents', () => {
  const st = (id: string, grade: Student['grade'], schoolId: string | null): Student => ({ id, name: id, grade, schoolId, regular: [] });
  const all = [st('a', '中1', 's1'), st('b', '中2', 's2'), st('c', '卒業', 's1'), st('d', '中1', null)];
  it('既定では卒業生を除く', () => {
    expect(filterStudents(all, {}).map((s) => s.id)).toEqual(['a', 'b', 'd']);
  });
  it('学年・学校で絞り込む／卒業生だけ', () => {
    expect(filterStudents(all, { grade: '中1', schoolId: 's1' }).map((s) => s.id)).toEqual(['a']);
    expect(filterStudents(all, { graduated: true }).map((s) => s.id)).toEqual(['c']);
  });
});
