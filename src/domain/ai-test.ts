/** AIで疑似テストを作れる回数（全体で1日あたり） */
export const AI_DAILY_LIMIT = 20;
export const DIFFICULTIES = { basic: '基本', standard: '標準', advanced: '応用' } as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const QUESTION_COUNTS = [5, 10, 15] as const;

/** 日本時間の日付 'YYYY-MM-DD' */
export const jstDay = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);

export interface TestType { key: string; label: string; instruction: string }
const GENERAL: TestType = { key: 'general', label: '総合', instruction: '範囲全体から、知識・計算・読解などをバランスよく出題する' };
const TYPES: Record<string, TestType[]> = {
  英語: [
    GENERAL,
    { key: 'grammar', label: '文法', instruction: '範囲で学ぶ文法事項に絞り、空所補充・語順整序・書きかえなどの文法問題だけを出題する' },
    { key: 'vocabulary', label: '単語', instruction: '範囲で学ぶ重要な英単語・熟語の意味（英→日）とつづり（日→英）を問う単語テストにする。1問につき1語' },
    { key: 'reading', label: '読解', instruction: '範囲の文法・語彙を使った短いオリジナルの英文を作り、その内容を問う読解問題にする' },
  ],
  国語: [
    GENERAL,
    { key: 'kanji', label: '漢字', instruction: '学年の配当漢字を中心に、読み・書き取りの漢字テストにする' },
    { key: 'grammar', label: '文法', instruction: '品詞・文節・用言の活用など、範囲の文法事項に絞って出題する' },
    { key: 'reading', label: '読解', instruction: '範囲の学習内容に沿った短いオリジナルの文章を作り、その内容を問う読解問題にする' },
  ],
  数学: [
    GENERAL,
    { key: 'calculation', label: '計算', instruction: '計算問題だけを出題する' },
    { key: 'word', label: '文章題', instruction: '日常の場面を使った文章題だけを出題する' },
  ],
  理科: [
    GENERAL,
    { key: 'terms', label: '用語', instruction: '重要語句を答える一問一答形式にする' },
    { key: 'descriptive', label: '記述', instruction: '理由やしくみを短く説明させる記述問題にする' },
  ],
  社会: [
    GENERAL,
    { key: 'terms', label: '用語', instruction: '重要語句を答える一問一答形式にする' },
    { key: 'descriptive', label: '記述', instruction: '背景や理由を短く説明させる記述問題にする' },
  ],
};

/** 科目ごとのテストの種類（先頭は総合） */
export const testTypesFor = (subject: string): TestType[] => TYPES[subject] ?? [GENERAL];
/** 保存されたテスト種類のキーを表示名にする */
export const testTypeLabel = (subject: string, key: string) => testTypesFor(subject).find((t) => t.key === key)?.label ?? '総合';

export interface TestRequest { materialId: string; unitIds: string[]; count: number; difficulty: Difficulty; testType: string }

/** 画面から届いた問題作成の依頼をチェックする */
export function parseTestRequest(input: unknown, subject?: string): { ok: true; value: TestRequest } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: '入力が正しくありません' };
  const x = input as Record<string, unknown>;
  if (typeof x.materialId !== 'string' || !x.materialId) return { ok: false, error: '教材が指定されていません' };
  if (!Array.isArray(x.unitIds) || !x.unitIds.every((u) => typeof u === 'string')) return { ok: false, error: '入力が正しくありません' };
  if (x.unitIds.length === 0) return { ok: false, error: '範囲を1つ以上選んでください' };
  if (x.unitIds.length > 30) return { ok: false, error: '範囲は30個までにしてください' };
  if (!QUESTION_COUNTS.includes(x.count as 5)) return { ok: false, error: '問題数は5・10・15から選んでください' };
  if (typeof x.difficulty !== 'string' || !(x.difficulty in DIFFICULTIES)) return { ok: false, error: '難易度が正しくありません' };
  const testType = x.testType === undefined ? 'general' : x.testType;
  const allowed = subject === undefined ? Object.values(TYPES).flat() : testTypesFor(subject);
  if (typeof testType !== 'string' || !allowed.some((t) => t.key === testType)) return { ok: false, error: 'テストの種類が正しくありません' };
  return { ok: true, value: { materialId: x.materialId, unitIds: x.unitIds as string[], count: x.count as number, difficulty: x.difficulty as Difficulty, testType } };
}

/** 目次の貼り付け（1行1単元）を単元名の配列にする */
export const splitUnitLines = (text: string) =>
  text.split(/\r?\n/).map((l) => l.trim().replace(/^[・\-*●]\s*/, '').trim()).filter(Boolean);
