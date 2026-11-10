import { describe, expect, it } from 'vitest';
import { NEIGHBORS, PREFECTURES, proximityRank, regionFor, sortByProximity } from './prefectures';

describe('prefectures', () => {
  it('47都道府県', () => {
    expect(Object.keys(PREFECTURES)).toHaveLength(47);
    expect(PREFECTURES['11']).toBe('埼玉県');
  });
  it('隣接はお互いさま（AがBの隣ならBもAの隣）', () => {
    for (const [a, list] of Object.entries(NEIGHBORS)) {
      for (const b of list) expect(NEIGHBORS[b], `${a}→${b}`).toContain(a);
    }
  });
  it('県内＋隣県', () => {
    expect(regionFor('11')).toEqual(['11', '08', '09', '10', '12', '13', '19', '20']);
    expect(regionFor('47')).toEqual(['47', '46']);
  });
  it('知らないコードは空', () => expect(regionFor('99')).toEqual([]));
});

describe('proximityRank（現在地からの近さ）', () => {
  it('現在地の県は0、隣県は1、その他は2', () => {
    expect(proximityRank('11', '11')).toBe(0);
    expect(proximityRank('11', '13')).toBe(1);
    expect(proximityRank('11', '27')).toBe(2);
  });
});

describe('sortByProximity（近い順）', () => {
  const s = (prefCode: string, name: string) => ({ prefCode, name });
  it('現在地 → 隣県 → その他、同じ順位は県コード → 学校名', () => {
    const list = [s('27', 'あ'), s('13', 'い'), s('11', 'う'), s('12', 'え'), s('11', 'あ'), s('13', 'あ')];
    expect(sortByProximity(list, '11').map((x) => x.prefCode + x.name)).toEqual(['11あ', '11う', '12え', '13あ', '13い', '27あ']);
  });
  it('元の配列は変えない', () => {
    const list = [s('27', 'あ'), s('11', 'あ')];
    sortByProximity(list, '11');
    expect(list[0].prefCode).toBe('27');
  });
});
