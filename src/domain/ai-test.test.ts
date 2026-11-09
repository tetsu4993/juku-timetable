import { describe, expect, it } from 'vitest';
import { AI_DAILY_LIMIT, jstDay, parseTestRequest } from './ai-test';

describe('jstDay', () => {
  it('日本時間の日付', () => {
    expect(jstDay(new Date('2026-11-09T14:59:00Z'))).toBe('2026-11-09');
    expect(jstDay(new Date('2026-11-09T15:00:00Z'))).toBe('2026-11-10');
  });
  it('1日の上限は20回', () => expect(AI_DAILY_LIMIT).toBe(20));
});

describe('parseTestRequest', () => {
  const ok = { materialId: 'm', unitIds: ['u1', 'u2'], count: 10, difficulty: 'standard' };
  it('正しい入力', () => expect(parseTestRequest(ok)).toEqual({ ok: true, value: ok }));
  it.each([
    [{ ...ok, unitIds: [] }, '範囲を1つ以上選んでください'],
    [{ ...ok, count: 7 }, '問題数は5・10・15から選んでください'],
    [{ ...ok, difficulty: 'hard' }, '難易度が正しくありません'],
    [{ ...ok, materialId: '' }, '教材が指定されていません'],
    [{ ...ok, unitIds: Array.from({ length: 31 }, (_, i) => `u${i}`) }, '範囲は30個までにしてください'],
    [null, '入力が正しくありません'],
  ])('%#: 不正な入力はエラー', (input, message) => {
    expect(parseTestRequest(input)).toEqual({ ok: false, error: message });
  });
});

import { splitUnitLines } from './ai-test';
describe('splitUnitLines', () => {
  it('1行1単元。空行・前後の空白・先頭の記号を除く', () => {
    expect(splitUnitLines(' 1章 正負の数\n\n・2章 文字式 \n- 3章 方程式\r\n')).toEqual(['1章 正負の数', '2章 文字式', '3章 方程式']);
  });
});
