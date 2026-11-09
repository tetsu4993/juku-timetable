# 段階3：見た目・マスタ・学年繰り上げ・学校・島 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 左サイドバーと新しい見た目、学校・島マスタ、年度の学年繰り上げ、マスごとの島選択を追加する。
**Architecture:** 判定は `src/domain/` の純粋関数（TDD）。DBはマイグレーション（Claude が `supabase db push`）。画面は既存部品を流用。
**Tech Stack:** Next.js 15 / Supabase / Tailwind v4 / dnd-kit / Vitest
**Spec:** `docs/superpowers/specs/2026-11-10-stage3-ui-and-master-design.md`

## Global Constraints
- 架空データのみ。`.env*` をコミットしない。URLは変えない。印刷の見た目を壊さない。
- 学年は `GRADES` ＋ `'卒業'`。繰り上げは年度（4月始まり）に1回だけ。

## Review Focus
1. 繰り上げボタンを2タブで同時に押す → 1学年だけ上がる（DB関数内で年度記録の一意制約）。
2. 卒業生 → 時間割・テンプレートの未配置一覧に出ない。既存の配置・成績は残る。
3. 島を選んだマスの配置を全員外す → 島の選択は残る。テンプレート反映・「テンプレートに戻す」で島もコピーされる。
4. 同じ日・コマで2人の先生が同じ島 → 両方のマスに ⚠。片方を変えると消える。
5. 学校を削除 → 生徒は残り、学校が未設定になる。

---

### Task 1: DB（0006）
- `schools(id, name, kind in ('小','中','高'))`、`islands(id, name, sort_order)`、`students.school_id → schools on delete set null`
- `cell_islands(date, period_id, teacher_id, island_id, unique(date, period_id, teacher_id))`、`template_islands(weekday, period_id, teacher_id, island_id, unique(weekday, period_id, teacher_id))`。外部キーは cascade。
- `promotions(year int primary key, done_at timestamptz)`
- `promote_grades(p_year int) returns boolean`（security invoker）：promotions に insert。衝突したら false。そうでなければ全生徒の grade を次の学年へ update する。
- `apply_template` と `reset_day_to_template` を作り直す：template_islands から cell_islands へコピーする（reset は、その日の cell_islands を消してからコピー）。
- 新テーブルに RLS（authenticated all）。
- [ ] 書く → push → Commit `feat: stage 3 schema`

### Task 2: domain（TDD）
- `nextGrade(g: Grade): Grade` — 小1→…→小6→中1…中3→高1…高3→卒業、卒業→卒業
- `fiscalYear(date: string): number`、`promotionDue(today: string, lastPromoted: number | null): boolean`。lastPromoted が null の初回は、今年度を「済み」とみなすため false。
- `duplicateIslands(cells: CellIsland[], periodId: string): Set<string>` — 重複した teacherId の集合
- `filterStudents(students, { grade?, schoolId?, graduated? })`
- [ ] テスト → FAIL → 実装 → PASS → Commit `feat: promotion, island and filter rules`

### Task 3: 見た目とサイドバー
- `src/app/(app)/layout.tsx` を `Sidebar` コンポーネント（client。usePathname で強調表示、マスタは開閉、スマホはハンバーガー）にする。
- Noto Sans JP（next/font）。カードと表のスタイルを `ui.tsx` で統一する。学年の色は小・中・高で分ける。
- [ ] 実装 → スクショで確認 → Commit `feat: sidebar and visual refresh`

### Task 4: 学校・島マスタと生徒画面
- `/schools` と `/islands` の CRUD。生徒フォームに学校の選択を追加。生徒一覧に学校列、学年・学校の絞り込み、「在籍／卒業」タブ。
- 繰り上げボタン：`promotionDue` が true のときに出す。確認ダイアログ → `promote_grades` → 再読込。
- [ ] 実装 → ブラウザ確認 → Commit `feat: school and island masters, grade promotion`

### Task 5: 島（時間割・テンプレート）
- 各マスのヘッダーに島のセレクト。repo に `listCellIslands(date)`、`setCellIsland(date, periodId, teacherId, islandId|null)`、template 版を追加。
- `duplicateIslands` で ⚠ を出す。卒業生を一覧から除く（Review Focus 2）。印刷時は島名を表示する。
- [ ] 実装 → ブラウザ確認（Focus 3・4）→ Commit `feat: islands per cell`

### Task 6: 学校の表示・絞り込み（成績）
- 点数入力：学校の絞り込みを追加。平均点は絞り込んだ結果で出す。面談資料とチップに学校名を表示する。
- [ ] 実装 → Commit `feat: school filters in grades`

### Task 7: デモデータと仕上げ
- reset_demo（0007）：学校4校、島5つ、生徒へ学校を割り当て、テンプレートの各マスに島を割り当てる。promotions に今年度を記録し、デモで繰り上げボタンが出ないようにする。
- テスト・ビルド → 公開版で確認 → README のスクショを更新 → 全体レビュー。
