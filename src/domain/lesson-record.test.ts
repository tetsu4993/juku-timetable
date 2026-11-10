import { describe, expect, it } from 'vitest';
import { previousRecord, sortRecords, UNDERSTANDING } from './lesson-record';
import type { LessonRecord } from './types';

const r = (id: string, date: string, subject: LessonRecord['subject'], createdAt = `${date}T10:00:00Z`): LessonRecord => ({
  id, studentId: 's', date, periodId: null, teacherId: null, placementId: null, subject, materialId: null,
  unitNames: [], understanding: '○', homework: '', note: '', teacherName: '', createdAt,
});

describe('UNDERSTANDING', () => {
  it('理解度は4段階', () => expect(UNDERSTANDING.map((u) => u.key)).toEqual(['◎', '○', '△', '×']));
});

describe('sortRecords', () => {
  it('新しい日付が先。同じ日なら後から書いたものが先', () => {
    const list = [r('a', '2026-11-01', '数学'), r('b', '2026-11-03', '数学'), r('c', '2026-11-03', '英語', '2026-11-03T12:00:00Z')];
    expect(sortRecords(list).map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('previousRecord', () => {
  const list = [r('a', '2026-11-01', '数学'), r('b', '2026-11-05', '数学'), r('c', '2026-11-06', '英語'), r('d', '2026-11-10', '数学')];
  it('その日より前の、同じ科目のいちばん新しい記録', () => {
    expect(previousRecord(list, '数学', '2026-11-10')?.id).toBe('b');
    expect(previousRecord(list, '英語', '2026-11-10')?.id).toBe('c');
  });
  it('なければ null', () => {
    expect(previousRecord(list, '数学', '2026-11-01')).toBeNull();
    expect(previousRecord(list, '国語', '2026-11-10')).toBeNull();
  });
});
