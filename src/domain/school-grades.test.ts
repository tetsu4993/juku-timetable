import { describe, expect, it } from 'vitest';
import { gradesForSchool } from './school-grades';

describe('gradesForSchool', () => {
  it('学校の種別に応じた学年', () => {
    expect(gradesForSchool('小')).toEqual(['小1', '小2', '小3', '小4', '小5', '小6']);
    expect(gradesForSchool('中')).toEqual(['中1', '中2', '中3']);
    expect(gradesForSchool('高')).toEqual(['高1', '高2', '高3']);
  });
});
