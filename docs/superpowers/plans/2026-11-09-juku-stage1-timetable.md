# 段階1：マスタ管理＋時間割 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 個人塾の先生・生徒・コマ・講習期間をマスタで管理し、日付ごとの時間割をドラッグ＆ドロップで組めるWebアプリを公開する。

**Architecture:** Next.js App Router（TypeScript）。業務ルールは `src/domain/` の純粋関数に集め、Vitestで単体テストする。データはSupabase（PostgreSQL）、画面からは supabase-js で読み書きし、RLSで「ログイン済み（匿名ゲスト含む）なら全操作可」とする。

**Tech Stack:** Next.js 15 / React 19 / TypeScript / Supabase（@supabase/ssr, supabase CLI） / dnd-kit（@dnd-kit/core） / Tailwind CSS / Vitest / Vercel

**Spec:** `docs/superpowers/specs/2026-11-09-juku-timetable-design.md`

## Global Constraints

- 実在の塾名・個人名・実データは入れない。デモデータは架空。
- デモ規模：先生5人、生徒70人、1コマ約25人。
- 先生1人あたり基本4人。超えても配置可、超えたマスは赤表示。
- 担当外の科目・学年は警告のみ（配置は可）。
- 同じ生徒を同じ日・同じコマに二重配置は不可（DBの一意制約でも防ぐ）。
- 秘密情報は `.env.local` とVercel環境変数のみ。`.env*` は `.gitignore` に入れる。
- 時間割画面はPC前提（幅1280px以上）。他画面はスマホで崩れない程度。
- 画面の文言は日本語。

## Review Focus

1. 講習の申込コマ数をすべて配置した生徒 → 未配置一覧から消える（または「配置済み」表示）。マイナスにならない。
2. 生徒を別の先生のマスへ移動 → 元のマスから消え、残りコマ数は変わらない。
3. 日付単位で「来られない」と登録した先生・生徒 → その日の一覧に出ない。
4. 緊急追加した生徒が通常期（申込コマ数なし） → 科目は曜日の受講科目、なければ生徒の全受講科目から選べる。
5. 2つのタブで同じ生徒を同時配置 → 一意制約エラーを画面に「すでに配置されています」と表示し、画面を再読込する。

---

## File Structure

```
supabase/migrations/0001_schema.sql      テーブル・制約・RLS
supabase/migrations/0002_reset_demo.sql  reset_demo() 関数
supabase/seed.sql                        デモデータ（reset_demo() を呼ぶだけ）
src/domain/types.ts                      ドメイン型
src/domain/attendance.ts                 その日の来塾者を求める
src/domain/remaining.ts                  残りコマ数・選べる科目
src/domain/warnings.ts                   定員超過・担当外の判定
src/domain/*.test.ts                     上記の単体テスト
src/lib/supabase/{client,server}.ts      Supabaseクライアント
src/lib/repo.ts                          DB読み書き（型変換をここに閉じる）
src/app/login/page.tsx                   ゲストログイン
src/app/(app)/layout.tsx                 ナビ・ログイン必須
src/app/(app)/teachers/…, students/…, periods/…, terms/…   マスタ画面
src/app/(app)/timetable/page.tsx         時間割画面（A案）
src/components/timetable/*.tsx           盤面・チップ・左パネル
src/app/api/reset/route.ts               デモリセット（ボタン＋Vercel Cron）
vercel.json                              Cron 設定
```

## ドメイン型（Task 2で定義、以後すべてのタスクが使う）

```ts
export type Weekday = 0|1|2|3|4|5|6;            // 0=日
export type Subject = '国語'|'数学'|'英語'|'理科'|'社会'|'音楽'|'美術'|'保健体育'|'技術家庭';
export type Grade = '小1'|'小2'|'小3'|'小4'|'小5'|'小6'|'中1'|'中2'|'中3'|'高1'|'高2'|'高3';
export interface Teacher { id: string; name: string; subjects: Subject[]; grades: Grade[]; weekdays: Weekday[] }
export interface Student { id: string; name: string; grade: Grade; regular: { weekday: Weekday; subject: Subject }[] }
export interface Period { id: string; name: string; start: string; end: string; sortOrder: number }
export interface Term { id: string; name: string; kind: 'regular'|'kosyu'; startDate: string; endDate: string }
export interface Enrollment { termId: string; studentId: string; subject: Subject; count: number }
export interface Availability { termId: string; personType: 'teacher'|'student'; personId: string; date: string; available: boolean }
export interface Placement { id: string; date: string; periodId: string; teacherId: string; studentId: string; subject: Subject }
export interface ExtraAttendee { date: string; studentId: string }
```

---

### Task 1: プロジェクト作成と公開の土台

**Files:** Create: Next.js一式, `vitest.config.ts`, `.gitignore`, `.env.example`

- [ ] **Step 1:** `npx create-next-app@latest juku-timetable --ts --tailwind --app --src-dir --eslint` を作業フォルダで実行し、`git init`。
- [ ] **Step 2:** `npm i @supabase/supabase-js @supabase/ssr @dnd-kit/core` と `npm i -D vitest supabase` を実行。
- [ ] **Step 3:** `src/domain/smoke.test.ts` に `expect(1+1).toBe(2)` を書き、`npx vitest run` → PASS。
- [ ] **Step 4:** `.env.example` に `NEXT_PUBLIC_SUPABASE_URL=` `NEXT_PUBLIC_SUPABASE_ANON_KEY=` `SUPABASE_SERVICE_ROLE_KEY=` `CRON_SECRET=` を書く。`.gitignore` に `.env*` と `!.env.example` があることを確認。
- [ ] **Step 5:** 【久保さん】GitHubに空リポジトリ `juku-timetable` を作成。`git push` 後、VercelでImportしてトップページが表示されることを確認。
- [ ] **Step 6:** Commit `chore: scaffold Next.js app`

### Task 2: データベースとドメイン型

**Files:** Create: `supabase/migrations/0001_schema.sql`, `src/domain/types.ts`

テーブル（すべて `id uuid primary key default gen_random_uuid()`）：
`teachers(name, subjects text[], grades text[], weekdays int[])` /
`students(name, grade)` / `student_regular(student_id, weekday, subject)` /
`periods(name, start_time time, end_time time, sort_order int)` /
`terms(name, kind text check in ('regular','kosyu'), start_date date, end_date date)` /
`enrollments(term_id, student_id, subject, count int check (count>0), unique(term_id,student_id,subject))` /
`availability(term_id, person_type, person_id uuid, date, available bool, unique(term_id,person_type,person_id,date))` /
`placements(date, period_id, teacher_id, student_id, subject, unique(date,period_id,student_id))` /
`extra_attendees(date, student_id, unique(date,student_id))`
外部キーは `on delete cascade`。全テーブルRLS有効、ポリシーは `to authenticated using (true) with check (true)`。

- [ ] **Step 1:** 【久保さん】Supabaseで新規プロジェクトを作り、URLとキーを `.env.local` とVercel環境変数に設定。Authentication設定で **Anonymous sign-ins を有効化**。
- [ ] **Step 2:** マイグレーションを書き、`npx supabase db push` → 成功。
- [ ] **Step 3:** SQLで同じ (date, period_id, student_id) を2回insertし、2回目が unique violation になることを確認。
- [ ] **Step 4:** `src/domain/types.ts` に上の型を書く。`npx tsc --noEmit` → エラーなし。
- [ ] **Step 5:** Commit `feat: add schema and domain types`

### Task 3: その日の来塾者（attendance）

**Files:** Create: `src/domain/attendance.ts`, `src/domain/attendance.test.ts`

**Produces:**
```ts
termForDate(terms: Term[], date: string): Term | null   // kosyuを優先、なければregular
teachersForDate(teachers: Teacher[], date: string, term: Term|null, avail: Availability[]): Teacher[]
studentsForDate(students: Student[], date: string, term: Term|null, enrollments: Enrollment[], avail: Availability[], extras: ExtraAttendee[]): Student[]
```
ルール：通常期は曜日（先生=weekdays、生徒=regularの曜日）。講習期は、先生は曜日、生徒は**その講習に申込がある生徒全員**を基準にする。どちらも availability の `available=false` で除外し、`available=true` で追加。extras は常に追加。重複なし。

- [ ] **Step 1: テスト**
  - `termForDate`：期間内のkosyuとregularが重なれば kosyu を返す。範囲外なら null。
  - 通常期の火曜：weekdays に2を含む先生だけ返る。
  - 講習期：申込のある生徒は曜日に関係なく返る。申込のない生徒は返らない。
  - `available=false` の生徒・先生は除外（Review Focus 3）。
  - extras の生徒は曜日外でも返り、重複しない。
- [ ] **Step 2:** `npx vitest run src/domain/attendance.test.ts` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** 同コマンド → PASS
- [ ] **Step 5:** Commit `feat: compute attendees for a date`

### Task 4: 残りコマ数と選べる科目（remaining）

**Files:** Create: `src/domain/remaining.ts`, `src/domain/remaining.test.ts`

**Produces:**
```ts
remainingBySubject(studentId: string, term: Term, enrollments: Enrollment[], placements: Placement[]): Partial<Record<Subject, number>>
selectableSubjects(student: Student, date: string, term: Term|null, enrollments: Enrollment[], placements: Placement[]): Subject[]
isFullyPlaced(studentId: string, term: Term, enrollments: Enrollment[], placements: Placement[]): boolean
```
`remainingBySubject` は term の期間内の placements だけを数え、0未満にしない。`selectableSubjects`：講習期は残り>0の科目。通常期はその曜日の regular 科目、なければその生徒の regular 全科目の重複なし（Review Focus 4）。

- [ ] **Step 1: テスト**
  - 数学10・英語8で数学を3配置 → `{数学:7, 英語:8}`。
  - 期間外の placement は数えない。
  - 申込より多く配置されても 0（Review Focus 1）。
  - 全科目0 → `isFullyPlaced` が true、`selectableSubjects` が []。
  - 通常期で曜日の受講なし → regular 全科目を返す。
- [ ] **Step 2–4:** `npx vitest run src/domain/remaining.test.ts` で FAIL → 実装 → PASS
- [ ] **Step 5:** Commit `feat: compute remaining lessons`

### Task 5: 警告判定（warnings）

**Files:** Create: `src/domain/warnings.ts`, `src/domain/warnings.test.ts`

**Produces:**
```ts
export const CAPACITY = 4;
isOverCapacity(placements: Placement[], date: string, periodId: string, teacherId: string): boolean   // > CAPACITY
canTeach(teacher: Teacher, grade: Grade, subject: Subject): boolean
isDoubleBooked(placements: Placement[], date: string, periodId: string, studentId: string, ignoreId?: string): boolean
```
- [ ] **Step 1: テスト** 4人 → false、5人 → true／担当外の科目・学年 → false／同じコマに既に配置 → true、自分自身（ignoreId）は除く。
- [ ] **Step 2–4:** FAIL → 実装 → PASS
- [ ] **Step 5:** Commit `feat: add placement warnings`

### Task 6: ゲストログインとDBアクセス層

**Files:** Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/repo.ts`, `src/app/login/page.tsx`, `src/app/(app)/layout.tsx`, `src/middleware.ts`

**Produces（repo.ts、すべて async、DBの snake_case をドメイン型に変換）：**
`listTeachers/listStudents/listPeriods/listTerms(): T[]`、`upsertTeacher/upsertStudent/upsertPeriod/upsertTerm(x)`、`deleteX(id)`、
`listEnrollments(termId)`、`setEnrollments(termId, studentId, rows)`、`listAvailability(termId)`、`setAvailability(row)`、
`listPlacements(date)`、`listPlacementsInRange(start, end)`、`addPlacement(p: Omit<Placement,'id'>): Placement`、`movePlacement(id, periodId, teacherId)`、`removePlacement(id)`、
`listExtras(date)`、`addExtras(date, studentIds[])`。
一意制約違反（code `23505`）は `class AlreadyPlacedError extends Error` を投げる。

- [ ] **Step 1:** ログイン画面に「ゲストとして試す」ボタン（`supabase.auth.signInAnonymously()`）。未ログインで `(app)` 配下を開くと `/login` へリダイレクト。
- [ ] **Step 2:** `npm run dev` で、ボタン → `/timetable`（仮ページ）に遷移することをブラウザで確認。
- [ ] **Step 3:** Commit `feat: guest login and repository`

### Task 7: マスタ画面

**Files:** Create: `src/app/(app)/{teachers,students,periods,terms}/page.tsx` と各フォームコンポーネント

- 先生：氏名、担当科目（9教科チェック）、担当学年、来塾曜日。
- 生徒：氏名、学年、曜日ごとの受講科目（通常期）。
- コマ：名前・開始・終了・並び順。
- 講習期間：名前、種別、開始日・終了日。講習の詳細画面で「生徒×科目の申込コマ数」の表と「先生・生徒の日付別の来塾可否」（日付×人のチェック表）を編集。
- 一覧・追加・編集・削除ができる。

- [ ] **Step 1:** 各画面を実装。
- [ ] **Step 2:** ブラウザで、先生1人・生徒1人・コマ1つ・講習1つを追加 → 一覧に出る → 編集 → 削除できることを確認。
- [ ] **Step 3:** 講習で生徒の数学を10コマに設定し、再読込しても残ることを確認。
- [ ] **Step 4:** Commit `feat: master data screens`

### Task 8: 時間割画面（A案）

**Files:** Create: `src/app/(app)/timetable/page.tsx`, `src/components/timetable/{Board,Cell,StudentChip,SidePanel,SubjectPicker}.tsx`

**Consumes:** Task 3–6 の関数すべて。

- 上部：日付選択（前日・翌日ボタン）、該当期間名の表示。
- 左（幅約30%）：来塾する先生／未配置の生徒（`isFullyPlaced` と当日配置済みを除く。講習期はチップに「数学 残7」などを表示）／緊急の曜日変更（その日の一覧にいない全生徒を検索付きチェックリスト → 「選んだ生徒を配置」で `addExtras`）。
- 右：行＝コマ（sort_order順）、列＝その日の先生。チップは「氏名 学年 科目」。
- 一覧 → マスにドロップ：`selectableSubjects` が1つなら即配置、複数なら `SubjectPicker`（小さいポップアップ）で選ぶ。0なら配置しない。
- マス → マス：`movePlacement`（科目はそのまま）。マス → 左の一覧：`removePlacement`。
- `isOverCapacity` のマスは赤背景。`canTeach` が false のチップは黄色の枠＋ツールチップ「担当外」。
- `AlreadyPlacedError` は「すでに配置されています」とトースト表示し、データを再取得（Review Focus 5）。

- [ ] **Step 1:** 実装。
- [ ] **Step 2:** ブラウザで確認：ドロップで配置 → 再読込しても残る／5人目でマスが赤くなる／別のマスへ移動すると元のマスから消え、残りコマ数は変わらない（Review Focus 2）／一覧に戻すと残りコマ数が1増える／緊急追加した生徒が一覧に出る。
- [ ] **Step 3:** 同じ生徒を2つのタブで同じコマに置き、2つ目でトーストが出ることを確認。
- [ ] **Step 4:** Commit `feat: drag and drop timetable`

### Task 9: デモデータとリセット

**Files:** Create: `supabase/migrations/0002_reset_demo.sql`, `supabase/seed.sql`, `src/app/api/reset/route.ts`, `vercel.json`

- `reset_demo()`（security definer）：全テーブルを truncate し、架空データを入れる。先生5人（担当科目・曜日はばらばら）、生徒70人（小5〜中3中心、1人2〜3科目）、コマ5つ（1限 13:00–14:20 から80分刻み）、通常期（今年度4/1〜3/31）、夏期講習（今年の7/21〜8/31、全生徒に科目ごと4〜12コマの申込、来られない日を数件）、夏期講習の初日〜3日目に配置を1日あたり約25件。
- `POST /api/reset`：ログイン済みなら service role で `reset_demo()` を実行。`GET /api/reset` は `Authorization: Bearer ${CRON_SECRET}` のときだけ実行。
- `vercel.json`：`{"crons":[{"path":"/api/reset","schedule":"0 18 * * *"}]}`（日本時間3時）。
- ナビに「デモデータを初期状態に戻す」ボタン（確認ダイアログ付き）。

- [ ] **Step 1:** 実装し、`npx supabase db push`。
- [ ] **Step 2:** ボタンを押して、先生5人・生徒70人が出ること、夏期講習初日の時間割に約25件あることを確認。
- [ ] **Step 3:** `curl` で Bearer なしの `GET /api/reset` が 401 になることを確認。
- [ ] **Step 4:** Commit `feat: demo data and reset`

### Task 10: 公開と仕上げ

- [ ] **Step 1:** 【久保さん】Vercelに `SUPABASE_SERVICE_ROLE_KEY` と `CRON_SECRET` を設定。
- [ ] **Step 2:** `npx vitest run` と `npm run build` → どちらも成功。
- [ ] **Step 3:** push → Vercelの本番URLで、ゲストログイン → 時間割の配置 → リセットまで通して動くことを確認。
- [ ] **Step 4:** `README.md` に、アプリの目的（塾講師の実体験）、主な機能、画面キャプチャ、技術構成、「AI駆動開発（Claude Code）で作成」を記載。Commit `docs: README`。
