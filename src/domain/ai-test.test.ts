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
  it('正しい入力（種類の指定がなければ総合）', () => expect(parseTestRequest(ok)).toEqual({ ok: true, value: { ...ok, testType: 'general' } }));
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

import { testTypesFor } from './ai-test';
describe('testTypesFor', () => {
  it('科目ごとのテストの種類（先頭は総合）', () => {
    expect(testTypesFor('英語').map((t) => t.key)).toEqual(['general', 'grammar', 'vocabulary', 'reading']);
    expect(testTypesFor('国語').map((t) => t.label)).toEqual(['総合', '漢字', '文法', '読解']);
    expect(testTypesFor('数学').map((t) => t.label)).toEqual(['総合', '計算', '文章題']);
    expect(testTypesFor('社会').map((t) => t.label)).toEqual(['総合', '用語', '記述']);
    expect(testTypesFor('音楽').map((t) => t.label)).toEqual(['総合']);
  });
  it('依頼のテスト種類は、その科目にあるものだけ受け付ける', () => {
    const base = { materialId: 'm', unitIds: ['u'], count: 5, difficulty: 'basic' };
    expect(parseTestRequest({ ...base, testType: 'vocabulary' }, '英語')).toMatchObject({ ok: true, value: { testType: 'vocabulary' } });
    expect(parseTestRequest({ ...base, testType: 'vocabulary' }, '数学')).toEqual({ ok: false, error: 'テストの種類が正しくありません' });
    expect(parseTestRequest(base, '数学')).toMatchObject({ ok: true, value: { testType: 'general' } });
  });
});
