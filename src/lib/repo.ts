import type {
  CellIsland, GeneratedTest, Island, MaterialUnit, School, SchoolMaterial, TargetSchool,
  Availability, Enrollment, Exam, ExtraAttendee, Grade, Period, Placement, Score, Student, Subject, Teacher, TemplateSlot, Term, Weekday,
} from '@/domain/types';
import { createClient } from './supabase/client';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export class AlreadyPlacedError extends Error {
  constructor() { super('すでに配置されています'); this.name = 'AlreadyPlacedError'; }
}

export function wrapError(e: { code?: string; message: string }): Error {
  return e.code === '23505' ? new AlreadyPlacedError() : new Error(e.message);
}

const hm = (t: string) => t.slice(0, 5);

export const toTeacher = (r: Row): Teacher =>
  ({ id: r.id, name: r.name, subjects: r.subjects, grades: r.grades, weekdays: r.weekdays });
export const toStudent = (r: Row): Student => ({
  id: r.id, name: r.name, grade: r.grade as Grade, schoolId: r.school_id ?? null,
  regular: (r.student_regular ?? []).map((x: Row) => ({ weekday: x.weekday as Weekday, subject: x.subject as Subject })),
});
export const toPeriod = (r: Row): Period =>
  ({ id: r.id, name: r.name, start: hm(r.start_time), end: hm(r.end_time), sortOrder: r.sort_order });
export const toTerm = (r: Row): Term =>
  ({ id: r.id, name: r.name, kind: r.kind, startDate: r.start_date, endDate: r.end_date });
export const toEnrollment = (r: Row): Enrollment =>
  ({ termId: r.term_id, studentId: r.student_id, subject: r.subject, count: r.count });
export const toAvailability = (r: Row): Availability =>
  ({ termId: r.term_id, personType: r.person_type, personId: r.person_id, date: r.date, available: r.available });
export const toPlacement = (r: Row): Placement =>
  ({ id: r.id, date: r.date, periodId: r.period_id, teacherId: r.teacher_id, studentId: r.student_id, subject: r.subject });
export const toExtra = (r: Row): ExtraAttendee => ({ date: r.date, studentId: r.student_id });
export const toTemplateSlot = (r: Row): TemplateSlot =>
  ({ id: r.id, weekday: r.weekday, periodId: r.period_id, teacherId: r.teacher_id, studentId: r.student_id, subject: r.subject });
export const toExam = (r: Row): Exam => ({ id: r.id, name: r.name, year: r.year, semester: r.semester, kind: r.kind });
export const toScore = (r: Row): Score => ({ examId: r.exam_id, studentId: r.student_id, subject: r.subject, score: r.score });

const db = () => createClient();

async function run<T>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw wrapError(error);
  return data as T;
}

// ---- マスタ ----
export const listTeachers = async () => (await run<Row[]>(db().from('teachers').select('*').order('name'))).map(toTeacher);
export const listStudents = async () =>
  (await run<Row[]>(db().from('students').select('*, student_regular(weekday, subject)').order('grade').order('name'))).map(toStudent);
export const listPeriods = async () => (await run<Row[]>(db().from('periods').select('*').order('sort_order'))).map(toPeriod);
export const listTerms = async () => (await run<Row[]>(db().from('terms').select('*').order('start_date'))).map(toTerm);

export async function upsertTeacher(t: Omit<Teacher, 'id'> & { id?: string }) {
  await run(db().from('teachers').upsert({ ...t }).select());
}
export async function upsertStudent(s: Omit<Student, 'id'> & { id?: string }) {
  const [row] = await run<Row[]>(db().from('students').upsert({ id: s.id, name: s.name, grade: s.grade, school_id: s.schoolId ?? null }).select());
  await run(db().from('student_regular').delete().eq('student_id', row.id));
  if (s.regular.length) {
    await run(db().from('student_regular').insert(s.regular.map((r) => ({ student_id: row.id, ...r }))));
  }
}
export async function upsertPeriod(p: Omit<Period, 'id'> & { id?: string }) {
  await run(db().from('periods').upsert({ id: p.id, name: p.name, start_time: p.start, end_time: p.end, sort_order: p.sortOrder }));
}
export async function upsertTerm(t: Omit<Term, 'id'> & { id?: string }) {
  await run(db().from('terms').upsert({ id: t.id, name: t.name, kind: t.kind, start_date: t.startDate, end_date: t.endDate }));
}
export const deleteTeacher = (id: string) => run(db().from('teachers').delete().eq('id', id));
export const deleteStudent = (id: string) => run(db().from('students').delete().eq('id', id));
export const deletePeriod = (id: string) => run(db().from('periods').delete().eq('id', id));
export const deleteTerm = (id: string) => run(db().from('terms').delete().eq('id', id));

// ---- 講習 ----
export const listEnrollments = async (termId: string) =>
  (await run<Row[]>(db().from('enrollments').select('*').eq('term_id', termId))).map(toEnrollment);
export async function setEnrollments(termId: string, studentId: string, rows: { subject: Subject; count: number }[]) {
  await run(db().from('enrollments').delete().eq('term_id', termId).eq('student_id', studentId));
  const valid = rows.filter((r) => r.count > 0);
  if (valid.length) {
    await run(db().from('enrollments').insert(valid.map((r) => ({ term_id: termId, student_id: studentId, ...r }))));
  }
}
export const listAvailability = async (termId: string) =>
  (await run<Row[]>(db().from('availability').select('*').eq('term_id', termId))).map(toAvailability);
export async function setAvailability(a: Availability | (Omit<Availability, 'available'> & { available: null })) {
  const key = { term_id: a.termId, person_type: a.personType, person_id: a.personId, date: a.date };
  if (a.available === null) {
    await run(db().from('availability').delete().match(key));
  } else {
    await run(db().from('availability').upsert({ ...key, available: a.available }, { onConflict: 'term_id,person_type,person_id,date' }));
  }
}

// ---- 時間割 ----
export const listPlacements = async (date: string) =>
  (await run<Row[]>(db().from('placements').select('*').eq('date', date))).map(toPlacement);
export const listPlacementsInRange = async (start: string, end: string) =>
  (await run<Row[]>(db().from('placements').select('*').gte('date', start).lte('date', end))).map(toPlacement);
export async function addPlacement(p: Omit<Placement, 'id'>): Promise<Placement> {
  const [row] = await run<Row[]>(db().from('placements').insert({
    date: p.date, period_id: p.periodId, teacher_id: p.teacherId, student_id: p.studentId, subject: p.subject,
  }).select());
  return toPlacement(row);
}
export const movePlacement = (id: string, periodId: string, teacherId: string) =>
  run(db().from('placements').update({ period_id: periodId, teacher_id: teacherId }).eq('id', id));
export const removePlacement = (id: string) => run(db().from('placements').delete().eq('id', id));
export const listExtras = async (date: string) =>
  (await run<Row[]>(db().from('extra_attendees').select('*').eq('date', date))).map(toExtra);
export async function addExtras(date: string, studentIds: string[]) {
  if (!studentIds.length) return;
  await run(db().from('extra_attendees').upsert(studentIds.map((s) => ({ date, student_id: s })), { onConflict: 'date,student_id', ignoreDuplicates: true }));
}

// ---- 曜日テンプレート ----
export const listTemplateSlots = async (weekday?: Weekday) => {
  let q = db().from('template_slots').select('*');
  if (weekday !== undefined) q = q.eq('weekday', weekday);
  return (await run<Row[]>(q)).map(toTemplateSlot);
};
export async function addTemplateSlot(s: Omit<TemplateSlot, 'id'>) {
  await run(db().from('template_slots').insert({
    weekday: s.weekday, period_id: s.periodId, teacher_id: s.teacherId, student_id: s.studentId, subject: s.subject,
  }));
}
export const moveTemplateSlot = (id: string, periodId: string, teacherId: string) =>
  run(db().from('template_slots').update({ period_id: periodId, teacher_id: teacherId }).eq('id', id));
export const removeTemplateSlot = (id: string) => run(db().from('template_slots').delete().eq('id', id));

const placementRow = (p: Omit<Placement, 'id'>) =>
  ({ date: p.date, period_id: p.periodId, teacher_id: p.teacherId, student_id: p.studentId, subject: p.subject });

/** その日にまだテンプレートを反映していなければ反映する（DB側で1トランザクション）。反映した場合 true */
export const applyTemplateIfNew = (date: string, rows: Omit<Placement, 'id'>[]) =>
  run<boolean>(db().rpc('apply_template', { p_date: date, p_rows: rows.map(placementRow) }));
/** その日の配置を消して、テンプレートから作り直す（DB側で1トランザクション） */
export const resetDayToTemplate = (date: string, rows: Omit<Placement, 'id'>[]) =>
  run(db().rpc('reset_day_to_template', { p_date: date, p_rows: rows.map(placementRow) }));

// ---- 成績 ----
export const listExams = async () => (await run<Row[]>(db().from('exams').select('*'))).map(toExam);
export async function upsertExam(e: Omit<Exam, 'id'> & { id?: string }) {
  await run(db().from('exams').upsert({ ...(e.id ? { id: e.id } : {}), name: e.name, year: e.year, semester: e.semester, kind: e.kind }));
}
export const deleteExam = (id: string) => run(db().from('exams').delete().eq('id', id));
export const listScores = async (examId: string) =>
  (await run<Row[]>(db().from('scores').select('*').eq('exam_id', examId))).map(toScore);
export const listScoresForStudent = async (studentId: string) =>
  (await run<Row[]>(db().from('scores').select('*').eq('student_id', studentId))).map(toScore);
export const setScore = (examId: string, studentId: string, subject: Subject, score: number | null) =>
  run(db().from('scores').upsert({ exam_id: examId, student_id: studentId, subject, score }, { onConflict: 'exam_id,student_id,subject' }));

// ---- 学校・島・繰り上げ ----
export const toSchool = (r: Row): School => ({ id: r.id, name: r.name, kind: r.kind });
export const toIsland = (r: Row): Island => ({ id: r.id, name: r.name, sortOrder: r.sort_order });
export const toCellIsland = (r: Row): CellIsland => ({ periodId: r.period_id, teacherId: r.teacher_id, islandId: r.island_id });

export const listSchools = async () => (await run<Row[]>(db().from('schools').select('*').order('kind').order('name'))).map(toSchool);
export const upsertSchool = (x: Omit<School, 'id'> & { id?: string }) => run(db().from('schools').upsert({ ...x }));
export const deleteSchool = (id: string) => run(db().from('schools').delete().eq('id', id));
export const listIslands = async () => (await run<Row[]>(db().from('islands').select('*').order('sort_order').order('name'))).map(toIsland);
export const upsertIsland = (x: Omit<Island, 'id'> & { id?: string }) =>
  run(db().from('islands').upsert({ ...(x.id ? { id: x.id } : {}), name: x.name, sort_order: x.sortOrder }));
export const deleteIsland = (id: string) => run(db().from('islands').delete().eq('id', id));

export const listCellIslands = async (date: string) =>
  (await run<Row[]>(db().from('cell_islands').select('*').eq('date', date))).map(toCellIsland);
export async function setCellIsland(date: string, periodId: string, teacherId: string, islandId: string | null) {
  const key = { date, period_id: periodId, teacher_id: teacherId };
  if (islandId === null) {
    await run(db().from('cell_islands').delete().match(key));
  } else {
    await run(db().from('cell_islands').upsert({ ...key, island_id: islandId }, { onConflict: 'date,period_id,teacher_id' }));
  }
}
export const listTemplateIslands = async (weekday: Weekday) =>
  (await run<Row[]>(db().from('template_islands').select('*').eq('weekday', weekday))).map(toCellIsland);
export async function setTemplateIsland(weekday: Weekday, periodId: string, teacherId: string, islandId: string | null) {
  const key = { weekday, period_id: periodId, teacher_id: teacherId };
  if (islandId === null) {
    await run(db().from('template_islands').delete().match(key));
  } else {
    await run(db().from('template_islands').upsert({ ...key, island_id: islandId }, { onConflict: 'weekday,period_id,teacher_id' }));
  }
}

/** 最後に学年を繰り上げた年度（記録がなければ null） */
export async function lastPromotedYear(): Promise<number | null> {
  const rows = await run<Row[]>(db().from('promotions').select('year').order('year', { ascending: false }).limit(1));
  return rows[0]?.year ?? null;
}
/** 学年を1つ上げる。その年度に実行済みなら false */
export const promoteGrades = (year: number) => run<boolean>(db().rpc('promote_grades', { p_year: year }));

// ---- 学校の使用教材 ----
export const toSchoolMaterial = (r: Row): SchoolMaterial =>
  ({ id: r.id, schoolId: r.school_id, grade: r.grade, subject: r.subject, name: r.name, publisher: r.publisher, memo: r.memo });
export const listSchoolMaterials = async (schoolId: string) =>
  (await run<Row[]>(db().from('school_materials').select('*').eq('school_id', schoolId).order('created_at'))).map(toSchoolMaterial);
export const upsertSchoolMaterial = (m: Omit<SchoolMaterial, 'id'> & { id?: string }) =>
  run(db().from('school_materials').upsert({
    ...(m.id ? { id: m.id } : {}), school_id: m.schoolId, grade: m.grade, subject: m.subject,
    name: m.name, publisher: m.publisher, memo: m.memo,
  }));
export const deleteSchoolMaterial = (id: string) => run(db().from('school_materials').delete().eq('id', id));

// ---- 教材の目次・疑似テスト ----
export const toMaterialUnit = (r: Row): MaterialUnit => ({ id: r.id, materialId: r.material_id, name: r.name, sortOrder: r.sort_order });
export const toGeneratedTest = (r: Row): GeneratedTest => ({
  id: r.id, materialId: r.material_id, unitNames: r.unit_names, difficulty: r.difficulty, testType: r.test_type ?? 'general',
  title: r.title, questions: r.questions, createdAt: r.created_at,
});
export async function getSchoolMaterial(id: string): Promise<SchoolMaterial | null> {
  const rows = await run<Row[]>(db().from('school_materials').select('*').eq('id', id));
  return rows[0] ? toSchoolMaterial(rows[0]) : null;
}
export const listMaterialUnits = async (materialId: string) =>
  (await run<Row[]>(db().from('material_units').select('*').eq('material_id', materialId).order('sort_order'))).map(toMaterialUnit);
/** 単元をまとめて末尾に追加（1行1単元） */
export async function addMaterialUnits(materialId: string, names: string[], startOrder: number) {
  if (!names.length) return;
  await run(db().from('material_units').insert(names.map((name, i) => ({ material_id: materialId, name, sort_order: startOrder + i + 1 }))));
}
export const renameMaterialUnit = (id: string, name: string) => run(db().from('material_units').update({ name }).eq('id', id));
export const deleteMaterialUnit = (id: string) => run(db().from('material_units').delete().eq('id', id));
export const listGeneratedTests = async (materialId: string) =>
  (await run<Row[]>(db().from('generated_tests').select('*').eq('material_id', materialId).order('created_at', { ascending: false }))).map(toGeneratedTest);
export async function getGeneratedTest(id: string): Promise<GeneratedTest | null> {
  const rows = await run<Row[]>(db().from('generated_tests').select('*').eq('id', id));
  return rows[0] ? toGeneratedTest(rows[0]) : null;
}
export const deleteGeneratedTest = (id: string) => run(db().from('generated_tests').delete().eq('id', id));

// ---- 志望校マスタ ----
export const toTargetSchool = (r: Row): TargetSchool => ({
  id: r.id, mextCode: r.mext_code, kind: r.kind, prefCode: r.pref_code, establishment: r.establishment,
  name: r.name, address: r.address, postal: r.postal, closed: r.closed,
  hensachi: r.hensachi, courses: r.courses, examSchedule: r.exam_schedule, examSubjects: r.exam_subjects,
  competition: r.competition, careerNote: r.career_note, sources: r.sources ?? [], researchedAt: r.researched_at,
});
/** 志望校をすべて読む（1回1000件までなので分けて取る） */
export async function listTargetSchools(): Promise<TargetSchool[]> {
  const all: TargetSchool[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = await run<Row[]>(db().from('target_schools').select('*').order('pref_code').order('kind').order('name').range(from, from + 999));
    all.push(...rows.map(toTargetSchool));
    if (rows.length < 1000) return all;
  }
}
export const listTargetRegions = async () =>
  (await run<Row[]>(db().from('target_school_regions').select('pref_code').order('pref_code'))).map((r) => r.pref_code as string);
export const updateTargetSchoolInfo = (id: string, x: Pick<TargetSchool, 'hensachi' | 'courses' | 'examSchedule' | 'examSubjects' | 'competition' | 'careerNote'>) =>
  run(db().from('target_schools').update({
    hensachi: x.hensachi, courses: x.courses, exam_schedule: x.examSchedule, exam_subjects: x.examSubjects,
    competition: x.competition, career_note: x.careerNote,
  }).eq('id', id));
