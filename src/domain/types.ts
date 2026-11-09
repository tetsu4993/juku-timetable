export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=日

export const SUBJECTS = ['国語', '数学', '英語', '理科', '社会', '音楽', '美術', '保健体育', '技術家庭'] as const;
export type Subject = (typeof SUBJECTS)[number];

export const GRADES = ['小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3', '高1', '高2', '高3'] as const;
export type Grade = (typeof GRADES)[number];

export interface Teacher { id: string; name: string; subjects: Subject[]; grades: Grade[]; weekdays: Weekday[] }
export interface Student { id: string; name: string; grade: Grade; regular: { weekday: Weekday; subject: Subject }[] }
export interface Period { id: string; name: string; start: string; end: string; sortOrder: number }
export interface Term { id: string; name: string; kind: 'regular' | 'kosyu'; startDate: string; endDate: string }
export interface Enrollment { termId: string; studentId: string; subject: Subject; count: number }
export interface Availability { termId: string; personType: 'teacher' | 'student'; personId: string; date: string; available: boolean }
export interface Placement { id: string; date: string; periodId: string; teacherId: string; studentId: string; subject: Subject }
export interface ExtraAttendee { date: string; studentId: string }

/** 'YYYY-MM-DD' の曜日（タイムゾーンに依存しない） */
export function weekdayOf(date: string): Weekday {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
}
