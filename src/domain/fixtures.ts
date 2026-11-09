import type { Student, Teacher, Term } from './types';

export const regular: Term = { id: 'r', name: '通常期', kind: 'regular', startDate: '2026-04-01', endDate: '2027-03-31' };
export const summer: Term = { id: 'k', name: '夏期講習', kind: 'kosyu', startDate: '2026-07-21', endDate: '2026-08-31' };

// 2026-11-10 は火曜(2)、2026-08-04 は火曜(2)
export const satoTue: Teacher = { id: 't1', name: '佐藤', subjects: ['数学', '英語'], grades: ['中1', '中2', '中3'], weekdays: [2, 4] };
export const suzukiMon: Teacher = { id: 't2', name: '鈴木', subjects: ['国語'], grades: ['中1'], weekdays: [1] };

export const tanakaTue: Student = { id: 's1', name: '田中', grade: '中2', regular: [{ weekday: 2, subject: '数学' }] };
export const itoWed: Student = { id: 's2', name: '伊藤', grade: '中1', regular: [{ weekday: 3, subject: '英語' }, { weekday: 5, subject: '国語' }] };
