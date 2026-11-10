# 06 CRUD表

画面・APIごとに、どのテーブルを **C**（作成）・**R**（参照）・**U**（更新）・**D**（削除）するかの一覧です。
- 画面 ID は [03 基本設計書](03_基本設計書.md) の画面一覧に対応します
- 「関数」は DB 関数（[05 テーブル定義書](05_テーブル定義書.md) 7章）経由の操作です
- 親テーブルの削除で、子テーブルの行も連動して消えます（cascade）。下の表には、画面が直接行う操作だけを書いています

## 1. 画面 × テーブル（マスタ・時間割）

| 画面 | teachers | students | student_regular | periods | terms | schools | islands | enrollments | availability | placements | extra_attendees | template_slots | day_status | cell_islands | template_islands |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S02 時間割 | R | R | R | R | R |  | R | R | R | **CRUD** | **CR** | R | C（関数） | **CRUD** | R（関数） |
| S03 曜日テンプレート | R | R | R | R |  |  | R |  |  |  |  | **CRUD** |  |  | **CRUD** |
| S06 生徒 |  | **CRUD**／U（関数） | **CRD** |  |  | R |  |  |  |  |  |  |  |  |  |
| S08 先生 | **CRUD** |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| S09 学校 |  |  |  |  |  | **CRUD** |  |  |  |  |  |  |  |  |  |
| S14 島 |  |  |  |  |  |  | **CRUD** |  |  |  |  |  |  |  |  |
| S15 コマ |  |  |  | **CRUD** |  |  |  |  |  |  |  |  |  |  |  |
| S16 期間・講習 |  |  |  |  | **CRUD** |  |  |  |  |  |  |  |  |  |  |
| S17 申込・来塾可否 | R | R | R |  | R |  |  | **CRD** | **CRUD** |  |  |  |  |  |  |

補足
- S02：配置の追加（C）・移動（U）・一覧へ戻す（D）。テンプレート反映（`apply_template`）と「テンプレートに戻す」（`reset_day_to_template`）は、関数の中で `placements` と `cell_islands` の C／D を行います
- S06：生徒の保存は「生徒を upsert → 受講曜日・科目を削除して入れ直し」。学年の繰り上げ（`promote_grades`）は `students` を U、`promotions` を C します
- S17：申込コマ数の保存は「その生徒・講習の申込を削除して入れ直し」。来塾可否は「いつも通り」を選ぶと行を削除します

## 2. 画面 × テーブル（成績・教材・志望校）

| 画面 | students | schools | exams | scores | promotions | school_materials | material_units | generated_tests | target_schools | target_school_regions |
|---|---|---|---|---|---|---|---|---|---|---|
| S04 定期テスト一覧 |  |  | **CRUD** |  |  |  |  |  |  |  |
| S05 点数入力 | R | R | R | **CRU** |  |  |  |  |  |  |
| S06 生徒（再掲） | — | R |  |  | R／C（関数） |  |  |  |  |  |
| S07 面談資料 | R | R | R | R |  |  |  |  |  |  |
| S10 学校の教材 |  | R |  |  |  | **CRUD** |  |  |  |  |
| S11 教材 |  |  |  |  |  | R | **CRUD** | **RD** |  |  |
| S12 疑似テスト |  |  |  |  |  | R |  | R |  |  |
| S13 志望校 |  |  |  |  |  |  |  |  | **RU** | R |

補足
- S05：点数は「テスト・生徒・科目」の組で upsert（未入力から入力＝C、変更＝U、空欄にする＝U で null）
- S13：AI調査の結果を手で直して保存（U）。登録・更新・AI調査は下の API が行います

## 3. API × テーブル

| API | 処理 | 操作するテーブル |
|---|---|---|
| `POST /api/reset` ／ `GET /api/reset`（Cron） | デモ初期化（`reset_demo`） | 下記以外の全テーブルを **D**（truncate）→ 架空データを **C**。対象外：`target_schools`・`target_school_regions`・`ai_usage` |
| `POST /api/generate-test` | AI疑似テスト作成 | `school_materials` R、`material_units` R、`ai_usage` CU（関数）、`generated_tests` **C** |
| `GET /api/generate-test` | 疑似テストの残り回数 | `ai_usage` R |
| `GET /api/target-schools/locate` | 現在地の県 | なし（国土地理院のみ） |
| `POST /api/target-schools/sync` | 志望校の登録・更新 | `target_school_regions` **CR**、`target_schools` **CU**（学校コードで upsert、閉校フラグ） |
| `POST /api/target-schools/[id]/research` | 志望校のAI調査 | `target_schools` **RU**、`ai_usage` CU（関数） |
| `GET /api/target-schools/[id]/research` | 調査の残り回数 | `ai_usage` R |

## 4. テーブル × 操作する画面・API（逆引き）

| テーブル | C | R | U | D |
|---|---|---|---|---|
| teachers | S08 | S02, S03, S17 | S08 | S08 |
| students | S06 | S02, S03, S05, S07, S17 | S06, 繰り上げ | S06 |
| student_regular | S06 | S02, S03, S17 | — | S06 |
| periods | S15 | S02, S03 | S15 | S15 |
| terms | S16 | S02, S17 | S16 | S16 |
| schools | S09 | S05, S06, S07, S10 | S09 | S09 |
| islands | S14 | S02, S03 | S14 | S14 |
| enrollments | S17 | S02 | — | S17 |
| availability | S17 | S02 | S17 | S17 |
| placements | S02, 反映関数 | S02 | S02 | S02, 戻す関数 |
| extra_attendees | S02 | S02 | — | — |
| template_slots | S03 | S02, S03 | S03 | S03 |
| day_status | 反映関数 | 反映関数 | — | — |
| cell_islands | S02, 反映関数 | S02 | S02 | S02, 戻す関数 |
| template_islands | S03 | S03, 反映関数 | S03 | S03 |
| exams | S04 | S04, S05, S07 | S04 | S04 |
| scores | S05 | S05, S07 | S05 | — |
| promotions | 繰り上げ関数 | S06 | — | — |
| school_materials | S10 | S10, S11, S12, AI疑似テスト | S10 | S10 |
| material_units | S11 | S11, AI疑似テスト | S11 | S11 |
| generated_tests | AI疑似テスト | S11, S12 | — | S11 |
| ai_usage | AI（関数） | AIの残り回数 | AI（関数） | — |
| target_schools | 登録・更新API | S13, AI調査 | S13, 登録・更新API, AI調査 | — |
| target_school_regions | 登録・更新API | S13, 登録・更新API | — | — |

※ すべてのテーブル（`target_schools`・`target_school_regions`・`ai_usage` を除く）は、デモ初期化で削除・再作成されます。
