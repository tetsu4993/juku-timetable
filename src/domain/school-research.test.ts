import { describe, expect, it } from 'vitest';
import { extractResearch, RESEARCH_DAILY_LIMIT } from './school-research';

const ok = { hensachi: '58', courses: '普通科', exam_schedule: '2月', exam_subjects: '5教科', competition: '1.2倍', career_note: '理系に強い' };

describe('extractResearch', () => {
  it('コードブロックのJSONを読む', () => {
    expect(extractResearch(`調べました。\n\`\`\`json\n${JSON.stringify(ok)}\n\`\`\``)).toEqual(ok);
  });
  it('コードブロックがなくても本文中のJSONを読む', () => {
    expect(extractResearch(`結果：${JSON.stringify(ok)} 以上です`)).toEqual(ok);
  });
  it('項目が足りない・壊れている場合は null', () => {
    expect(extractResearch('{"hensachi":"58"}')).toBeNull();
    expect(extractResearch('JSONなし')).toBeNull();
  });
  it('1日の上限は10校', () => expect(RESEARCH_DAILY_LIMIT).toBe(10));
});
