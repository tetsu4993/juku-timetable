import { GRADES, type CellIsland, type Grade, type Student } from './types';

const SEQ: Grade[] = [...GRADES, '卒業'];

/** 4月の繰り上げ後の学年。高3→卒業、卒業はそのまま */
export function nextGrade(g: Grade): Grade {
  const i = SEQ.indexOf(g);
  return SEQ[Math.min(i + 1, SEQ.length - 1)];
}

/** 'YYYY-MM-DD' の年度（4月始まり） */
export function fiscalYear(date: string): number {
  const [y, m] = date.split('-').map(Number);
  return m >= 4 ? y : y - 1;
}

/** 繰り上げボタンを出すか。記録がない初回は今年度を済みとみなす */
export function promotionDue(today: string, lastPromoted: number | null): boolean {
  return lastPromoted !== null && fiscalYear(today) > lastPromoted;
}

/** そのコマで、他の先生と同じ島を選んでいる先生のID */
export function duplicateIslands(cells: CellIsland[], periodId: string): Set<string> {
  const byIsland = new Map<string, string[]>();
  for (const c of cells.filter((x) => x.periodId === periodId)) {
    byIsland.set(c.islandId, [...(byIsland.get(c.islandId) ?? []), c.teacherId]);
  }
  return new Set([...byIsland.values()].filter((ts) => ts.length > 1).flat());
}

/** 生徒の絞り込み。既定では卒業生を除く */
export function filterStudents(
  students: Student[], f: { grade?: string; schoolId?: string; graduated?: boolean },
): Student[] {
  return students.filter((s) =>
    (f.graduated ? s.grade === '卒業' : s.grade !== '卒業')
    && (!f.grade || s.grade === f.grade)
    && (!f.schoolId || s.schoolId === f.schoolId));
}
