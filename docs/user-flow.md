# ユーザー動線：雑入力からフィードバック完了まで

## フロー概要

```
ホーム画面（雑入力）
  │
  ├─ テキスト入力 or 音声録音→文字起こし
  │
  ▼
[AI] 素材整理 (organizing step=organize)
  │
  ▼
素材確認・編集画面 (materials)
  │  ユーザーが内容を確認・修正して「次へ」
  │
  ▼
[AI] 結論候補生成 (organizing step=conclusions)
  │
  ▼
結論選択画面 (conclusion)
  │  A/B/C の3候補から1つ選んで「この結論で進める」
  │
  ▼
[AI] スピーチプラン生成 (organizing step=plan)
  │
  ▼
伝える順番確認画面 (plan)
  │  ステップ一覧を確認して「この順番で進める」
  │
  ▼
[AI] スクリプト生成 (organizing step=script)
  │
  ▼
スクリプト確認画面 (script)
  │  30秒版 / 1分版 / Slack文面を切替表示
  │  キーワード一覧を確認して「自分の言葉で練習する」
  │
  ▼
リハーサル画面 (rehearsal)
  │  キーワードを見ながら録音
  │  「停止してフィードバックへ」
  │
  ▼
[AI] フィードバック生成 (organizing step=feedback)
  │
  ▼
フィードバック画面 (feedback)
  │  - 良かった点
  │  - 改善するともっと伝わる点
  │  - 次の一言
  │  - Before / After
  │
  ├─「整理内容を保存」→ 保存完了画面 (saved)
  └─「もう一度話す」→ リハーサル画面に戻る
```

## 各ステップの詳細

### 1. ホーム画面 (`app/index.tsx`)

- テキストを直接入力するか、マイクボタンで音声録音
- 音声の場合: 録音 → `POST /v1/transcribe` で文字起こし → テキスト欄に反映
- 「整理する」ボタンで端末ローカルにセッションを作成
- organizing 画面（step=organize）へ遷移

### 2. 素材整理 [AI処理] (`app/session/[sessionId]/organizing.tsx`)

- `POST /v1/organize-package` に rawInput を送信
- AI が内容を分類（現状・課題・背景・懸念・目的・依頼・不明点）
- 結果を端末ローカルのセッションに保存し、materials 画面へ遷移

### 3. 素材確認・編集画面 (`app/session/[sessionId]/materials.tsx`)

- AI が整理した素材（MaterialItem[]）をカード形式で表示
- 各項目のテキストをユーザーが自由に編集可能
- 空の項目があっても次へ進める
- 「次へ」で編集結果を保存し、organizing（step=conclusions）へ

### 4. 結論候補生成 [AI処理]

- `POST /v1/conclusions` に rawInput + materials を送信
- AI が結論候補を3つ（A/B/C）生成
- 結果を端末ローカルのセッションに保存し、conclusion 画面へ遷移

### 5. 結論選択画面 (`app/session/[sessionId]/conclusion.tsx`)

- 3つの結論候補をカード表示
- ユーザーが1つ選択
- 「この結論で進める」で selectedConclusion を保存し、organizing（step=plan）へ

### 6. スピーチプラン生成 [AI処理]

- `POST /v1/speech-plan` に materials + conclusion を送信
- AI が話す順番（SpeechStep[]）を生成
- 結果をセッションに保存し、plan 画面へ遷移

### 7. 伝える順番確認画面 (`app/session/[sessionId]/plan.tsx`)

- タイトル・リード文・ステップ一覧を表示
- 各ステップに番号・タイトル・内容・理由を表示
- 「この順番で進める」で organizing（step=script）へ

### 8. スクリプト生成 [AI処理]

- `POST /v1/script` に materials + conclusion + speechPlan を送信
- AI が 30秒版スクリプト（+ 1分版・Slack文面）とキーワードを生成
- 結果を端末ローカルのセッションに保存し、script 画面へ遷移

### 9. スクリプト確認画面 (`app/session/[sessionId]/script.tsx`)

- 30秒版 / 1分版 / Slack文面をタブ切替で表示
- キーワードをチップ表示
- 「自分の言葉で練習する」で rehearsal 画面へ

### 10. リハーサル画面 (`app/session/[sessionId]/rehearsal.tsx`)

- キーワードをチップ表示（カンペ代わり）
- タイマー表示付きで録音
- 「停止してフィードバックへ」で rehearsal 結果（録音時間）を端末ローカルに保存し、organizing（step=feedback）へ
- 「説明文に戻る」で script 画面に戻ることも可能

### 11. フィードバック生成 [AI処理]

- `POST /v1/feedback` に rawInput + conclusion + speechPlan + script + rehearsal を送信
- AI がフィードバックを生成
- 結果を端末ローカルのセッションに保存し、feedback 画面へ遷移

### 12. フィードバック画面 (`app/session/[sessionId]/feedback.tsx`)

- 良かった点（positives）
- 改善するともっと伝わる点（improvements）
- 次の一言（nextPhrase）
- Before / After（整理前と整理後の比較）
- 「整理内容を保存」→ saved 画面へ
- 「もう一度話す」→ rehearsal 画面に戻ってループ可能

## API エンドポイントまとめ

| ステップ | メソッド | パス | 用途 |
|---|---|---|---|
| 文字起こし | POST | `/v1/transcribe` | 音声→テキスト |
| 素材整理 | POST | `/v1/organize-package` | rawInput→MaterialItem[] |
| 結論候補 | POST | `/v1/conclusions` | 結論A/B/C生成 |
| スピーチプラン | POST | `/v1/speech-plan` | 話す順番生成 |
| スクリプト | POST | `/v1/script` | 30秒説明文生成 |
| フィードバック | POST | `/v1/feedback` | 整理度レビュー |

セッション作成・取得・更新・履歴一覧は API ではなく、モバイル端末内のローカル保存を使う。

## セッションの状態遷移

`SessionRecord` の各フィールドがステップ進行に応じて埋まっていく:

```
rawInput          ← ホーム画面で入力
materials         ← organize で生成
conclusionCandidates ← conclusions で生成
selectedConclusion   ← ユーザーが選択
speechPlan        ← plan で生成
script            ← script で生成
rehearsal         ← リハーサルで記録
feedback          ← feedback で生成
```
