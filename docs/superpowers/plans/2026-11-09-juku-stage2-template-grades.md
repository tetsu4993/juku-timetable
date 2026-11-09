# 段階2：曜日テンプレート ＋ 成績管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 曜日ごとのテンプレート時間割（開いた日に自動反映・その日だけ変更・印刷）と、定期テスト9教科の成績入力・面談資料（比較表＋グラフ＋印刷）を追加する。

**Architecture:** 業務ルール（テンプレートのコピー対象、前回比較、合計・平均、テストの並び順）は `src/domain/` の純粋関数にしてVitestで固める。DBは `0003_stage2.sql`（久保さんがSQL Editorで実行）。画面は段階1の部品（useLoad, Cell, StudentChip, SidePanel, Modal）を再利用。

**Tech Stack:** Next.js 15 / React 19 / Supabase / dnd-kit / Vitest / recharts（新規）

**Spec:** `docs/superpowers/specs/2026-11-09-stage2-template-and-grades-design.md`

## Global Constraints
- データはすべて架空。`.env*` はコミットしない。SQLは久保さんが手で実行する（`supabase db push` は使わない）。
- 科目は `SUBJECTS`（9教科）、点数は 0〜100 の整数か空欄（null）。空欄は0点扱いしない。
- 新テーブルにも段階1と同じRLS（authenticated all）。
- テンプレート反映は通常期のみ。講習期間には反映しない。

## Review Focus
1. 同じ日付を2つのタブで同時に開く → テンプレートが二重にコピーされない（`day_status` の一意制約で勝者だけがコピー）。
2. テンプレート反映後に全員を一覧へ戻して再読込 → 再コピーされない。
3. その日来られない生徒・先生、その曜日に来ない先生のテンプレート行 → コピーされない。
4. 点数欄に 101・-1・小数・文字 → 保存されず、元の値に戻る。空にすると null になる。
5. 前回テストに点数がない生徒 → 増減は表示しない（「—」）。科目ごとに前回が空欄なら、その科目は増減なし。

---

### Task 1: DB（テンプレート・日付状態・テスト・点数）

**Files:** Create `supabase/migrations/0003_stage2.sql`

- `template_slots(id, weekday int 1..5, period_id→periods cascade, teacher_id→teachers cascade, student_id→students cascade, subject text, unique(weekday, period_id, student_id))`
- `day_status(date date primary key, from_template boolean not null default true, created_at timestamptz default now())`
- `exams(id, name text, year int, semester int check 1..3, kind text check in ('midterm','final'))`
- `scores(id, exam_id→exams cascade, student_id→students cascade, subject text, score int null check (score between 0 and 100), unique(exam_id, student_id, subject))`
- 4テーブルにRLS "authenticated all"。
- [ ] Step 1: 書く。 Step 2:【久保さん】SQL Editorで実行。 Step 3: Commit `feat: stage 2 schema`

### Task 2: テンプレートのコピー対象（domain, TDD）

**Files:** Create `src/domain/template.ts`, `src/domain/template.test.ts`; Modify `src/domain/types.ts`

**Interfaces — Produces:**
- `interface TemplateSlot { id: string; weekday: Weekday; periodId: string; teacherId: string; studentId: string; subject: Subject }`
- `templateToPlacements(slots: TemplateSlot[], date: string, term: Term | null, teachers: Teacher[], availability: Availability[]): Omit<Placement,'id'>[]`

- [ ] Step 1: 失敗するテスト：
  - 通常期・火曜の日付 → weekday=2 のスロットだけが `date` 付きで返る
  - 講習期間（`summer`）→ `[]`、term=null → `[]`
  - 生徒が `available=false` の日 → その行を除外（Review Focus 3）
  - 先生が `available=false`、または先生の `weekdays` にその曜日がない → その先生の行を除外
- [ ] Step 2: `npx vitest run src/domain/template.test.ts` → FAIL
- [ ] Step 3: 実装（`teachersForDate` を再利用してよい）
- [ ] Step 4: 同コマンド → PASS。Commit `feat: template to placements`

### Task 3: 成績の計算（domain, TDD）

**Files:** Create `src/domain/grades.ts`, `src/domain/grades.test.ts`; Modify `src/domain/types.ts`

**Interfaces — Produces:**
- `interface Exam { id: string; name: string; year: number; semester: 1|2|3; kind: 'midterm'|'final' }`
- `interface Score { examId: string; studentId: string; subject: Subject; score: number | null }`
- `sortExams(exams: Exam[]): Exam[]` — year→semester→midterm<final の昇順
- `totalOf(scores: Score[]): number | null` — null を除いた合計、全部 null/空なら null
- `diffFromPrevious(exams: Exam[], scores: Score[], studentId: string, examId: string): { total: number|null; bySubject: Partial<Record<Subject, number>> }` — 前回＝その生徒に1つ以上点数がある直前のテスト。前回なし→ total null・bySubject 空。科目は両方に値があるときだけ差を入れる（Review Focus 5）
- `subjectAverages(scores: Score[], examId: string): Partial<Record<Subject, number>>` — null 除外、小数第1位に四捨五入
- `parseScore(input: string): number | null | 'invalid'` — '' → null、0〜100の整数 → 数値、それ以外 → 'invalid'（Review Focus 4）

- [ ] Step 1: 上の各関数の失敗するテスト（期待値を具体的に：例 `totalOf([80,null,70]) = 150`、`parseScore('101')='invalid'`, `parseScore('7.5')='invalid'`, `parseScore(' 85 ')=85`）
- [ ] Step 2: FAIL 確認 → Step 3: 実装 → Step 4: PASS。Commit `feat: grade calculations`

### Task 4: repo 追加

**Files:** Modify `src/lib/repo.ts`, `src/lib/repo.test.ts`

**Produces:** `listTemplateSlots(weekday)`, `addTemplateSlot(s)`, `moveTemplateSlot(id, periodId, teacherId)`, `removeTemplateSlot(id)`, `applyTemplateIfNew(date, rows: Omit<Placement,'id'>[]): Promise<boolean>`（`day_status` に insert、23505 なら false を返しコピーしない。成功時のみ placements を一括 insert）, `resetDayToTemplate(date, rows)`（その日の placements を削除→rows を insert、day_status は残す）, `listExams()`, `upsertExam`, `deleteExam`, `listScores(examId)`, `listScoresForStudent(studentId)`, `setScore(examId, studentId, subject, score|null)`（upsert on unique）。マッパー `toTemplateSlot`, `toExam`, `toScore`。

- [ ] Step 1: マッパーの失敗するテスト（snake→camel）。 Step 2: FAIL。 Step 3: 実装。 Step 4: PASS。Commit `feat: stage 2 repository`

### Task 5: テンプレート画面

**Files:** Create `src/app/(app)/templates/page.tsx`; Modify `src/app/(app)/layout.tsx`（ナビに「テンプレート」）

- 月〜金タブ。表は時間割と同じ（コマ×その曜日に来る先生）。左の一覧：その曜日の `regular` を持ち、まだ全科目が置かれていない生徒（科目が複数なら SubjectPicker）。
- 警告：`isOverCapacity`・`canTeach`・二重配置は段階1の関数を、TemplateSlot を Placement 形に見立てて再利用（date には `'template'` などの固定値）。
- [ ] Step 1: 実装。 Step 2: ブラウザで、火曜に3人配置→再読込で残る、移動・一覧へ戻すが動く。Commit `feat: weekday template editor`

### Task 6: 時間割への反映・テンプレートに戻す・印刷

**Files:** Modify `src/app/(app)/timetable/page.tsx`; Create `src/app/print.css`（または globals.css に `@media print`）

- 読み込み時：通常期 かつ その日の placements が0件 かつ day_status なし → `applyTemplateIfNew(date, templateToPlacements(...))` → 再読込。
- 「テンプレートに戻す」ボタン（通常期のみ、確認ダイアログ）→ `resetDayToTemplate`。
- 「印刷」ボタン → `window.print()`。印刷時はナビ・左パネル・ボタンを隠し、表をA4横に収める。
- [ ] Step 1: 実装。 Step 2: ブラウザで Review Focus 1・2 を確認（2タブ同時に開く／全員戻して再読込）。印刷プレビューが1枚。Commit `feat: apply weekday template and print`

### Task 7: テスト一覧と点数入力

**Files:** Create `src/app/(app)/tests/page.tsx`, `src/app/(app)/tests/[id]/page.tsx`; Modify layout（ナビ「成績」）

- 一覧：名前・年度・学期・種別、追加（モーダル）・削除。
- 入力：生徒×9教科の表、学年で絞り込み、欄を離れたら `parseScore` → 'invalid' なら元に戻してトースト、それ以外は `setScore`。表の下に `subjectAverages`。
- [ ] Step 1: 実装。 Step 2: ブラウザで Review Focus 4 を確認。Commit `feat: exams and score entry`

### Task 8: 生徒の成績ページ（面談資料）

**Files:** Create `src/app/(app)/students/[id]/grades/page.tsx`; Modify `src/app/(app)/students/page.tsx`（各行に「成績」リンク）; `npm i recharts`

- 点数表（テスト×9教科＋合計、空欄は「—」、各セルに前回比 ↑n/↓n）。
- 合計の折れ線、科目を選ぶ折れ線（recharts）。
- 「印刷」→ A4縦1枚。
- [ ] Step 1: 実装。 Step 2: ブラウザで表示・印刷プレビュー確認。Commit `feat: student grade report`

### Task 9: デモデータ拡張と仕上げ

**Files:** Modify `supabase/migrations/0002_reset_demo.sql`（truncate 対象に新テーブル追加）; README

- reset_demo：各生徒の `student_regular` から template_slots を作る（担当できる先生、1コマ先生あたり最大2人、置けない分は一覧に残す）。exams を4回（前年度3学期期末、今年度1学期中間・期末、2学期中間）。scores は全生徒分、中間は5教科・期末は9教科、生徒ごとの基準点±ばらつき（0〜100に収める）。
- [ ] Step 1: 実装。 Step 2:【久保さん】0002 を再実行。 Step 3: リセット→ テンプレート・成績ページ・グラフを公開版で確認。 Step 4: README に機能とキャプチャ追加。`npm test` と `npm run build` 成功。Commit `feat: stage 2 demo data and docs`
