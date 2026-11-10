import { expect, test } from 'vitest';
import { AlreadyPlacedError, toPeriod, toPlacement, toStudent, toTerm, wrapError } from './repo';

test('DBの行をドメイン型に変換する', () => {
  expect(toPeriod({ id: 'p', name: '1限', start_time: '13:00:00', end_time: '14:20:00', sort_order: 1 }))
    .toEqual({ id: 'p', name: '1限', start: '13:00', end: '14:20', sortOrder: 1 });
  expect(toTerm({ id: 'k', name: '夏期', kind: 'kosyu', start_date: '2026-07-21', end_date: '2026-08-31' }))
    .toEqual({ id: 'k', name: '夏期', kind: 'kosyu', startDate: '2026-07-21', endDate: '2026-08-31' });
  expect(toPlacement({ id: 'x', date: '2026-08-04', period_id: 'p', teacher_id: 't', student_id: 's', subject: '数学' }))
    .toEqual({ id: 'x', date: '2026-08-04', periodId: 'p', teacherId: 't', studentId: 's', subject: '数学' });
  expect(toStudent({ id: 's', name: '田中', grade: '中2', student_regular: [{ weekday: 2, subject: '数学' }] }))
    .toEqual({ id: 's', name: '田中', grade: '中2', schoolId: null, regular: [{ weekday: 2, subject: '数学' }] });
});

test('一意制約違反(23505)は AlreadyPlacedError になる', () => {
  expect(wrapError({ code: '23505', message: 'dup' })).toBeInstanceOf(AlreadyPlacedError);
  expect(wrapError({ code: '42501', message: 'denied' })).not.toBeInstanceOf(AlreadyPlacedError);
});

test('段階2の行を変換する', async () => {
  const { toTemplateSlot, toExam, toScore } = await import('./repo');
  expect(toTemplateSlot({ id: 'a', weekday: 2, period_id: 'p', teacher_id: 't', student_id: 's', subject: '数学' }))
    .toEqual({ id: 'a', weekday: 2, periodId: 'p', teacherId: 't', studentId: 's', subject: '数学' });
  expect(toExam({ id: 'e', name: '1学期中間', year: 2026, semester: 1, kind: 'midterm' }))
    .toEqual({ id: 'e', name: '1学期中間', year: 2026, semester: 1, kind: 'midterm' });
  expect(toScore({ exam_id: 'e', student_id: 's', subject: '英語', score: null }))
    .toEqual({ examId: 'e', studentId: 's', subject: '英語', score: null });
});

test('教材の行を変換する', async () => {
  const { toSchoolMaterial } = await import('./repo');
  expect(toSchoolMaterial({ id: 'm', school_id: 's', grade: '中1', subject: '英語', name: 'NEW HORIZON', publisher: '東京書籍', memo: '' }))
    .toEqual({ id: 'm', schoolId: 's', grade: '中1', subject: '英語', name: 'NEW HORIZON', publisher: '東京書籍', memo: '' });
});

test('志望校の行を変換する', async () => {
  const { toTargetSchool } = await import('./repo');
  const s = toTargetSchool({ id: 'x', mext_code: 'D1', kind: '高校', pref_code: '11', establishment: '公立', name: 'あおば高', address: 'a', postal: 'p',
    closed: false, hensachi: '', courses: '', exam_schedule: '', exam_subjects: '', competition: '', career_note: '', sources: null, researched_at: null });
  expect(s).toMatchObject({ mextCode: 'D1', prefCode: '11', examSchedule: '', sources: [], researchedAt: null });
});

test('授業記録の行を変換する', async () => {
  const { toLessonRecord } = await import('./repo');
  expect(toLessonRecord({ id: 'r', student_id: 's', date: '2026-11-10', period_id: null, teacher_id: 't', placement_id: null, subject: '数学',
    material_id: null, unit_names: null, understanding: '△', homework: 'p.10', note: '', teacher_name: '山田先生', created_at: 'x' }))
    .toMatchObject({ studentId: 's', teacherId: 't', unitNames: [], understanding: '△', teacherName: '山田先生' });
});
