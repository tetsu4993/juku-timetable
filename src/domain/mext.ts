/** 文部科学省「学校コード一覧」CSV を読み、志望校マスタの対象を取り出す */

export interface TargetSchoolRow {
  code: string; kind: '中学' | '高校'; prefCode: string; establishment: '国立' | '公立' | '私立';
  name: string; address: string; postal: string;
}

/** 引用符（中の改行・カンマ・""）に対応したCSVの読み取り */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const ESTABLISHMENT = { '1': '国立', '2': '公立', '3': '私立' } as const;

/**
 * 指定した都道府県の「私立中学」と「全高校」（廃止済みを除く）。
 * 列：学校コード, 学校種, 都道府県番号, 設置区分, 本分校, 学校名, 学校所在地, 郵便番号, 設定年月日, 廃止年月日, …
 */
export function toTargetSchools(rows: string[][], prefCodes: string[]): TargetSchoolRow[] {
  const prefs = new Set(prefCodes);
  const out: TargetSchoolRow[] = [];
  for (const r of rows) {
    const [code, type, pref, est, , name, address, postal, , closed] = r;
    if (!/^[A-Z]\d/.test(code ?? '') || closed) continue;
    const prefCode = pref?.slice(0, 2);
    const estCode = est?.slice(0, 1) as keyof typeof ESTABLISHMENT;
    if (!prefs.has(prefCode) || !ESTABLISHMENT[estCode]) continue;
    const kind = type?.startsWith('C1') ? '中学' : type?.startsWith('D1') ? '高校' : null;
    if (!kind || (kind === '中学' && estCode !== '3')) continue;
    out.push({ code, kind, prefCode, establishment: ESTABLISHMENT[estCode], name, address, postal });
  }
  return out;
}

/** 文科省ページのHTMLから、いちばん新しい公表日（ファイル名先頭の日付）のCSVのURL */
export function latestCsvLinks(html: string): string[] {
  const links = [...html.matchAll(/href="(\/content\/(\d{8})-[^"]+\.csv)"/g)].map((m) => ({ path: m[1], date: m[2] }));
  if (!links.length) return [];
  const latest = links.reduce((a, b) => (b.date > a ? b.date : a), links[0].date);
  return [...new Set(links.filter((l) => l.date === latest).map((l) => `https://www.mext.go.jp${l.path}`))];
}

/** 国土地理院の市区町村コード（4〜5桁）→ 都道府県コード */
export function prefFromMuniCode(muniCd: string): string | null {
  if (!/^\d{4,5}$/.test(muniCd)) return null;
  const code = muniCd.padStart(5, '0').slice(0, 2);
  return Number(code) >= 1 && Number(code) <= 47 ? code : null;
}
