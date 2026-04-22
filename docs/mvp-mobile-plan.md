# kotoba-gym MVP実装計画

## 概要

- MVP は `apps/mobile` を新設し、**Expo Managed workflow / Expo Go / iPhone優先** で構築する。
- API は既存の `apps/server` を継続利用し、**Hono** をサーバーのエントリポイントとして残す。
- 履歴保存は端末ローカルのみとし、認証とサーバーDBはMVPでは扱わない。
- Gemini の利用モデルは `GEMINI_MODEL=gemini-3-flash-preview` を前提とする。
- 比較結果は別エンドポイントに切り出さず、**2回目の評価レスポンスに同梱**する。

## Honoの位置づけ

- Hono は今回も採用する。
- 役割は **モバイルアプリからのAPI受け口** で、`apps/server` に配置する。
- `@hono/node-server` を使って Node.js 上で動かし、Expo アプリから HTTP で呼ぶ構成にする。
- 既存の Web 音声検証向け SSE/TTS 中心の設計はそのまま引き継がず、MVP 向けにシンプルな JSON / multipart API に整理する。

### Honoで担当するもの

- お題一覧の返却
- 音声ファイルの受け取り
- Gemini への評価依頼
- 2回目評価時の比較結果生成
- クライアント向けレスポンスの整形

### Honoでやらないもの

- ユーザー認証
- 永続DB管理
- リアルタイム音声ストリーミング
- Web クライアント向けの専用最適化

## モノレポ構成

```text
kotoba-gym/
├── apps/
│   ├── mobile/    # Expo app
│   └── server/    # Hono API
└── packages/
    └── core/      # 共有スキーマ・型・お題定義
```

## 実装方針

### mobile

- `apps/mobile` を新設する。
- 画面は `ホーム` `お題詳細/録音` `フィードバック` `比較` `履歴` の5つを用意する。
- 録音は Expo の現行推奨に合わせて `expo-audio` を使う。
- iPhone 向けの録音設定は **高品質 `.m4a` / AAC** を明示し、Gemini にそのまま渡せる形式で固定する。
- 録音後、音声ファイルを Hono API に送信し、まとめて評価結果を受け取る。
- 履歴は `expo-file-system` に JSON として保存し、インデックスだけを軽く保持する。音声ファイル自体は保持しない。

### server

- `apps/server` は Hono を維持し、MVP向けAPIに整理する。
- Gemini 呼び出し、評価JSONの検証、比較結果生成を担当する。
- 提供APIは `/v1/prompts` と `/v1/evaluations` に限定する。
- モバイルの画面フローに合わせた request/response 型に寄せる。

### core

- `packages/core` は共有スキーマ中心に再整理する。
- 共有対象は `お題カテゴリ` `評価軸` `評価レスポンス` `比較レスポンス` `履歴レコード` とする。
- Node.js 依存の処理やログ保存責務は `apps/server` に寄せる。
- `practice.ts` `prompts.ts` と最小 export だけを維持する。

## API案

### `GET /v1/prompts`

- カテゴリ別お題一覧を返す。

### `POST /v1/evaluations`

- 入力: `promptId`, `attemptNumber`, `audio file`, `locale`, 任意で `previousAttemptSummary`
- 出力:
  - `transcript`
  - `summary`
  - `scores`
  - `goodPoints`
  - `improvementPoints`
  - `exampleAnswer`
  - `nextFocus`
  - `comparison`
    - 1回目では `null`
    - 2回目では `scoreDiff`, `improvedPoints`, `remainingPoints`, `comparisonSummary` を返す

### API設計メモ

- 比較は 2 回目評価の文脈に強く依存するため、`POST /v1/comparisons` は作らない。
- 2 回目の `POST /v1/evaluations` に `previousAttemptSummary` と 1 回目の構造化評価結果を渡し、サーバーで比較結果をまとめて返す。
- これによりクライアント側は「録音して評価を受ける」1本の流れだけを実装すればよい。

## 保存方針

- 履歴本体は `expo-file-system` 配下に 1 セッション 1 JSON ファイルで保存する。
- 一覧表示用の軽いインデックスだけを保持する。実装上必要なら `AsyncStorage` にインデックスを置いてもよいが、本体保存には使わない。
- 保存するのは `prompt`, `attempts`, `scores`, `feedback`, `comparison`, `createdAt`, `updatedAt` までに絞る。
- `exampleAnswer` や長文フィードバックは保存対象に含めるが、音声バイナリは保存しない。

## エラー方針

- Gemini のタイムアウト、5xx、レートリミット時はモバイルに `再試行可能` エラーとして返す。
- モバイルは `もう一度試す` ボタンを表示し、録音し直しではなく **同じ音声ファイルの再送** を1回は許可する。
- バリデーションエラーや音声フォーマット不正は `再録音が必要` なエラーとして返す。
- ユーザー向け文言は技術詳細を隠し、内部ログでは Hono 側に原因コードを残す。

## テスト観点

- `packages/core`
  - Zod schema の parse 成功/失敗
  - 評価軸とカテゴリ定義の整合
- `apps/server`
  - MIME 判定
  - multipart 入力 parsing
  - Gemini 失敗時のエラーハンドリング
  - 2回目評価時の比較結果同梱
- `apps/mobile`
  - API base URL 解決
  - エラーパース
  - 評価表示から再挑戦、比較、履歴保存までの導線
  - session record の保存/更新ロジック

## 前提

- Expo は Expo Go 前提とする。
- iPhone で先に成立させ、Android は後続対応とする。
- TTS、リアルタイム字幕、ストリーミング応答はMVP対象外とする。
