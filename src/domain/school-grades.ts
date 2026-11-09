import { GRADES, type Grade, type School } from './types';

/** 学校の種別（小・中・高）に応じた学年 */
export const gradesForSchool = (kind: School['kind']): Grade[] => GRADES.filter((g) => g.startsWith(kind));
