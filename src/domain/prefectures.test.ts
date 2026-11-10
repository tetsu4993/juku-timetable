import { describe, expect, it } from 'vitest';
import { NEIGHBORS, PREFECTURES, regionFor } from './prefectures';

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
