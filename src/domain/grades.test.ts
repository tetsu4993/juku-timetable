import { describe, expect, it } from 'vitest';
import { diffFromPrevious, parseScore, sortExams, subjectAverages, totalOf } from './grades';
import type { Exam, Score } from './types';

const e = (id: string, year: number, semester: 1 | 2 | 3, kind: Exam['kind']): Exam => ({ id, name: id, year, semester, kind });
const s = (examId: string, studentId: string, subject: Score['subject'], score: number | null): Score => ({ examId, studentId, subject, score });
const exams = [e('2f', 2026, 1, 'final'), e('1m', 2026, 1, 'midterm'), e('0f', 2025, 3, 'final'), e('3m', 2026, 2, 'midterm')];

describe('sortExams', () => {
  it('年度→学期→中間・期末の順', () => {
    expect(sortExams(exams).map((x) => x.id)).toEqual(['0f', '1m', '2f', '3m']);
  });
});

describe('totalOf', () => {
  it('空欄を除いて合計、全部空欄なら null', () => {
    expect(totalOf([s('x', 'a', '国語', 80), s('x', 'a', '数学', null), s('x', 'a', '英語', 70)])).toBe(150);
    expect(totalOf([s('x', 'a', '国語', null)])).toBeNull();
    expect(totalOf([])).toBeNull();
  });
});

describe('diffFromPrevious', () => {
  const scores = [
    s('0f', 'a', '国語', 60), s('0f', 'a', '数学', 50),
    // 1m は生徒 a の点数なし → 飛ばす
    s('2f', 'a', '国語', 72), s('2f', 'a', '数学', null), s('2f', 'a', '英語', 80),
  ];
  it('点数のある直前のテストと比べる。両方に値がある科目だけ差を出す', () => {
    expect(diffFromPrevious(exams, scores, 'a', '2f')).toEqual({ total: 152 - 110, bySubject: { 国語: 12 } });
  });
  it('前回がなければ増減なし', () => {
    expect(diffFromPrevious(exams, scores, 'a', '0f')).toEqual({ total: null, bySubject: {} });
  });
});

describe('subjectAverages', () => {
  it('空欄を除き小数第1位で四捨五入', () => {
    const sc = [s('x', 'a', '国語', 80), s('x', 'b', '国語', 75), s('x', 'c', '国語', 70), s('x', 'c', '数学', null), s('y', 'a', '国語', 0)];
    expect(subjectAverages([...sc, s('x', 'd', '国語', 76)], 'x')).toEqual({ 国語: 75.3 });
  });
});

describe('parseScore', () => {
  it.each([
    ['', null], ['  ', null], [' 85 ', 85], ['0', 0], ['100', 100],
    ['101', 'invalid'], ['-1', 'invalid'], ['7.5', 'invalid'], ['abc', 'invalid'],
  ])('%s → %s', (input, out) => expect(parseScore(input)).toBe(out));
});
