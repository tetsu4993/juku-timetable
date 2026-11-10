import { describe, expect, it } from 'vitest';
import { parseCsv, toTargetSchools } from './mext';

const CSV = `﻿文部科学省　学校コード一覧,,,,,,,,,,更新日：,2026/5/20
学校コード,学校種,都道府県番号,"設置
区分",本分校,学校名,学校所在地,郵便番号,"属性情報
設定年月日","属性情報
廃止年月日","旧学校
調査番号",移行後の学校コード
C111110000010,C1(中学校),11(埼玉県),3(私),1(本),さくら学園中学校,"埼玉県さいたま市1-2",3300001,2020-01-01,,,
C111210000011,C1(中学校),11(埼玉県),2(公),1(本),市立みどり中学校,埼玉県川口市,3320001,2020-01-01,,,
D111310000012,D1(高等学校),11(埼玉県),2(公),1(本),県立あおば高等学校,埼玉県川越市,3500001,2020-01-01,,,
D111310000099,D1(高等学校),11(埼玉県),2(公),1(本),県立ふるい高等学校,埼玉県川越市,3500002,2020-01-01,2025-03-31,,
D113310000013,D1(高等学校),13(東京都),3(私),1(本),ひかり高等学校,東京都新宿区,1600001,2020-01-01,,,
D127310000014,D1(高等学校),27(大阪府),3(私),1(本),なにわ高等学校,大阪府大阪市,5300001,2020-01-01,,,
B111110000015,B1(小学校),11(埼玉県),3(私),1(本),さくら学園小学校,埼玉県さいたま市,3300001,2020-01-01,,,
`;

describe('parseCsv', () => {
  it('引用符の中の改行・カンマを扱える', () => {
    const rows = parseCsv('a,"b\nc","d,e"\n1,2,3\n');
    expect(rows).toEqual([['a', 'b\nc', 'd,e'], ['1', '2', '3']]);
  });
});

describe('toTargetSchools', () => {
  it('指定県の私立中学と全高校だけ。廃止校は除く', () => {
    const r = toTargetSchools(parseCsv(CSV), ['11', '13']);
    expect(r.map((s) => s.name)).toEqual(['さくら学園中学校', '県立あおば高等学校', 'ひかり高等学校']);
    expect(r[0]).toEqual({
      code: 'C111110000010', kind: '中学', prefCode: '11', establishment: '私立',
      name: 'さくら学園中学校', address: '埼玉県さいたま市1-2', postal: '3300001',
    });
    expect(r[1].establishment).toBe('公立');
  });
});

import { latestCsvLinks, prefFromMuniCode } from './mext';
describe('latestCsvLinks', () => {
  it('ページ内のCSVリンクから、いちばん新しい公表日のものだけ', () => {
    const html = `<a href="/content/20260825-x_2-1.csv">a</a><a href="/content/20260825-x_4.csv">b</a>
      <a href="/content/20251226-x_2.csv">c</a><a href="/other.pdf">d</a>`;
    expect(latestCsvLinks(html)).toEqual([
      'https://www.mext.go.jp/content/20260825-x_2-1.csv', 'https://www.mext.go.jp/content/20260825-x_4.csv',
    ]);
  });
  it('リンクがなければ空', () => expect(latestCsvLinks('<p>none</p>')).toEqual([]));
});

describe('prefFromMuniCode', () => {
  it('市区町村コードの先頭2桁が都道府県', () => {
    expect(prefFromMuniCode('11107')).toBe('11');
    expect(prefFromMuniCode('1100')).toBe('01'); // 北海道は4桁で返ることがある
    expect(prefFromMuniCode('')).toBeNull();
    expect(prefFromMuniCode('99999')).toBeNull();
  });
});
