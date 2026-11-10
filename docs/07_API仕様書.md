# 07 API仕様書

本アプリのサーバーAPI（`src/app/api/`）の仕様です。画面からのデータの読み書きは、多くが Supabase へ直接行います（RLSで保護）。秘密キー・外部サービス・AIが必要な処理だけをAPIにしています。

共通事項
- 認証：Supabase のログインセッション（Cookie）。未ログインは `401 {"error":"ログインしてください"}`（例外は Cron 用の `GET /api/reset`）
- 形式：JSON。エラーは `{"error": "日本語のメッセージ"}`
- AI機能は、`ANTHROPIC_API_KEY` が未設定なら `503`

---

## 1. デモの初期化

### POST /api/reset
画面の「デモデータを初期状態に戻す」から呼びます。

| 項目 | 内容 |
|---|---|
| 認証 | ログイン必須 |
| 処理 | service role で `reset_demo()` を実行 |
| 200 | `{"ok": true}` |
| 401 | 未ログイン |
| 500 | `{"error":"server not configured"}`（キー未設定）／DBエラー |

### GET /api/reset
Vercel Cron（毎日 18:00 UTC＝日本時間 3:00、`vercel.json`）から呼ばれます。

| 項目 | 内容 |
|---|---|
| 認証 | ヘッダー `Authorization: Bearer <CRON_SECRET>` が一致すること |
| 200 | `{"ok": true}` |
| 401 | 合言葉が違う、または `CRON_SECRET` 未設定 |

---

## 2. AI疑似テスト

### POST /api/generate-test

リクエスト
```json
{
  "materialId": "教材のID",
  "unitIds": ["単元ID", "..."],
  "count": 10,
  "difficulty": "standard",
  "testType": "vocabulary"
}
```
| 項目 | 必須 | 条件 |
|---|---|---|
| materialId | ○ | 空でない文字列 |
| unitIds | ○ | 1〜30件。すべてその教材の単元であること |
| count | ○ | 5・10・15 |
| difficulty | ○ | `basic`（基本）・`standard`（標準）・`advanced`（応用） |
| testType |  | その教材の科目にある種類（[04 詳細設計書](04_詳細設計書.md) 6.1）。省略時 `general` |

レスポンス
| コード | 本文 | 条件 |
|---|---|---|
| 200 | `{"id": "作成したテストのID"}` | 成功 |
| 400 | `{"error": "範囲を1つ以上選んでください"}` など | 入力が条件外 |
| 404 | `{"error": "教材または範囲が見つかりません"}` | |
| 429 | `{"error": "本日の上限（20回）に達しました。…"}` | 1日の上限 |
| 502 | `{"error": "AIが問題を作れませんでした。…"}` | AIの拒否・形式不正（回数は戻す） |
| 503 | `{"error": "AIの設定（APIキー）がまだ行われていません"}` など | キー未設定・AI混雑・キー不正 |
| 500 | `{"error": "問題の作成に失敗しました"}` | その他（回数は戻す） |

AIへの依頼
- モデル `claude-opus-5-5`、`effort: medium`、`max_tokens: 16000`
- 構造化出力（zod）：`{title, questions: [{unit, question, choices[], answer, explanation}]}`
- 関数の最大実行時間 120秒

### GET /api/generate-test
疑似テストの本日の残り回数。
```json
{ "limit": 20, "remaining": 18, "enabled": true }
```

---

## 3. 志望校

### GET /api/target-schools/locate?lat={緯度}&lon={経度}
| 項目 | 内容 |
|---|---|
| 入力 | 日本の範囲（緯度20〜46、経度122〜154）のみ。範囲外は 400 |
| 処理 | 国土地理院の逆ジオコーダで市区町村コードを取得し、先頭2桁を都道府県とする |
| 200 | `{"prefCode":"11","prefName":"埼玉県","region":[{"code":"11","name":"埼玉県"},{"code":"08","name":"茨城県"}, ...]}` |
| 502 | 都道府県を特定できなかった |

### POST /api/target-schools/sync
| 項目 | 内容 |
|---|---|
| 入力 | `{"prefCode":"11"}`（地域を追加して更新）または `{}`（登録済みの地域を更新） |
| 処理 | ① prefCode があれば、その県＋隣県を登録地域に追加 ② 文科省ページから最新CSVのURLを探す ③ CSVを取得し、登録地域の私立中学・全高校（廃止除く）を抽出 ④ 学校コードで upsert（AIの調査結果は残す）⑤ 今回なかった学校を閉校にする |
| 200 | `{"prefectures":["埼玉県", ...],"total":1533,"juniorHigh":287,"highSchool":1246,"closed":0}` |
| 400 | 都道府県コードが不正／登録地域がない |
| 502 | 文科省のデータを取得できない |
| 最大実行時間 | 60秒 |

### POST /api/target-schools/{id}/research
| 項目 | 内容 |
|---|---|
| 処理 | 1日の回数（10校）を消費 → Claude が Web検索で調査 → 6項目と出典を保存 |
| 200 | `{"ok": true}` |
| 404 | 学校が見つからない |
| 429 | 本日の上限（10校） |
| 502 | 調査結果を読み取れない（回数は戻す） |
| 503 | キー未設定・AI混雑・キー不正 |
| 最大実行時間 | 300秒 |

AIへの依頼
- モデル `claude-opus-5-5`、`effort: medium`
- ツール `web_search_20260209`（最大6回、所在地：日本）。`pause_turn` のときは続きを最大5回依頼
- 回答の最後の ```json から `hensachi, courses, exam_schedule, exam_subjects, competition, career_note` を読む

### GET /api/target-schools/{id}/research
志望校調査の本日の残り回数（`{id}` は任意の文字列で可）。
```json
{ "limit": 10, "remaining": 9, "enabled": true }
```
