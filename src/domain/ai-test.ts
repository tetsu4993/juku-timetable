/** AIで疑似テストを作れる回数（全体で1日あたり） */
export const AI_DAILY_LIMIT = 20;
export const DIFFICULTIES = { basic: '基本', standard: '標準', advanced: '応用' } as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const QUESTION_COUNTS = [5, 10, 15] as const;

/** 日本時間の日付 'YYYY-MM-DD' */
export const jstDay = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);

export interface TestRequest { materialId: string; unitIds: string[]; count: number; difficulty: Difficulty }

/** 画面から届いた問題作成の依頼をチェックする */
export function parseTestRequest(input: unknown): { ok: true; value: TestRequest } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: '入力が正しくありません' };
  const x = input as Record<string, unknown>;
  if (typeof x.materialId !== 'string' || !x.materialId) return { ok: false, error: '教材が指定されていません' };
  if (!Array.isArray(x.unitIds) || !x.unitIds.every((u) => typeof u === 'string')) return { ok: false, error: '入力が正しくありません' };
  if (x.unitIds.length === 0) return { ok: false, error: '範囲を1つ以上選んでください' };
  if (x.unitIds.length > 30) return { ok: false, error: '範囲は30個までにしてください' };
  if (!QUESTION_COUNTS.includes(x.count as 5)) return { ok: false, error: '問題数は5・10・15から選んでください' };
  if (typeof x.difficulty !== 'string' || !(x.difficulty in DIFFICULTIES)) return { ok: false, error: '難易度が正しくありません' };
  return { ok: true, value: { materialId: x.materialId, unitIds: x.unitIds as string[], count: x.count as number, difficulty: x.difficulty as Difficulty } };
}

/** 目次の貼り付け（1行1単元）を単元名の配列にする */
export const splitUnitLines = (text: string) =>
  text.split(/\r?\n/).map((l) => l.trim().replace(/^[・\-*●]\s*/, '').trim()).filter(Boolean);
