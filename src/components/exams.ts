import type { Exam } from '@/domain/types';

export const EXAM_KIND_LABEL = { midterm: '中間', final: '期末' } as const;
export const autoExamName = (e: Pick<Exam, 'year' | 'semester' | 'kind'>) => `${e.year}年度 ${e.semester}学期 ${EXAM_KIND_LABEL[e.kind]}`;
/** グラフの軸用の短い名前（例：26年1学期中間） */
export const shortExamName = (e: Exam) => `${String(e.year).slice(2)}年${e.semester}学期${EXAM_KIND_LABEL[e.kind]}`;
