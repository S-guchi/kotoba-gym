# kotoba-gym I/F ドキュメント

## 1. 概要

現在の `kotoba-gym` は、ユーザーが `テーマ / 相手 / 目的` を入力し、
サーバー側の LLM が練習用の `Theme` を生成し、
そのテーマに対して何度でも音声練習できる構成です。

主な境界は次の 3 つです。

- `apps/mobile` と `apps/server` の HTTP API
- `packages/core` が提供する共有 schema / type
- モバイル内部で使うテーマ / セッション取得 I/F

## 2. ドメインモデル

### 2.1 ThemeInput

ユーザーが最初に入力する値です。

```ts
type ThemeInput = {
  theme: string;
  audience: string;
  goal: string;
};
```

### 2.2 ThemeRecord

LLM が整理した練習テーマです。

```ts
type ThemeRecord = {
  id: string;
  title: string;
  userInput: ThemeInput;
  mission: string;
  audienceSummary: string;
  talkingPoints: string[];
  recommendedStructure: string[];
  durationLabel: "30〜45秒" | "45〜60秒" | "60〜90秒";
  createdAt: string;
  updatedAt: string;
};
```

### 2.3 PracticeSessionRecord

1 つのテーマに対する録音セッションです。

```ts
type PracticeSessionRecord = {
  id: string;
  theme: ThemeRecord;
  attempts: PracticeSessionAttempt[];
  createdAt: string;
  updatedAt: string;
};
```

`attempts` は最大 2 件です。

## 3. モバイル画面ルート

| ルート                            | 用途                 | 主な入力                |
| --------------------------------- | -------------------- | ----------------------- |
| `/`                               | ホーム               | なし                    |
| `/theme/new`                      | テーマ作成           | なし                    |
| `/theme/[themeId]`                | テーマ詳細           | `themeId`               |
| `/practice/[themeId]`             | 録音画面             | `themeId`, `sessionId`  |
| `/session/[sessionId]/analyzing`  | 解析待機             | `sessionId`             |
| `/session/[sessionId]/feedback`   | 評価表示             | `sessionId`             |
| `/session/[sessionId]/comparison` | 1回目/2回目比較      | `sessionId`             |
| `/history`                        | 練習履歴             | なし                    |

## 4. HTTP API

共通:

- CORS: `origin: *`
- 返却形式: JSON
- 所有者識別: `ownerKey`

### 4.1 `GET /health`

```json
{ "ok": true }
```

### 4.2 `GET /v1/themes`

クエリ:

| 名前       | 型     | 必須 |
| ---------- | ------ | ---- |
| `ownerKey` | string | 必須 |

レスポンス:

```json
{
  "themes": [ThemeRecord]
}
```

### 4.3 `POST /v1/themes`

リクエスト:

```json
{
  "ownerKey": "owner-...",
  "input": {
    "theme": "APIキャッシュ戦略を見直した理由",
    "audience": "新メンバー",
    "goal": "設計意図を誤解なく理解してほしい"
  }
}
```

レスポンス:

```json
{
  "theme": ThemeRecord
}
```

### 4.4 `GET /v1/themes/:themeId`

クエリ:

| 名前       | 型     | 必須 |
| ---------- | ------ | ---- |
| `ownerKey` | string | 必須 |

レスポンス:

```json
{
  "theme": ThemeRecord
}
```

未存在時は `404 theme_not_found`。

### 4.5 `POST /v1/sessions`

リクエスト:

```json
{
  "ownerKey": "owner-...",
  "themeId": "theme-..."
}
```

レスポンス:

```json
{
  "session": PracticeSessionRecord
}
```

### 4.6 `GET /v1/sessions`

クエリ:

| 名前       | 型     | 必須 |
| ---------- | ------ | ---- |
| `ownerKey` | string | 必須 |

レスポンス:

```json
{
  "sessions": [PracticeSessionRecord]
}
```

### 4.7 `GET /v1/sessions/:sessionId`

クエリ:

| 名前       | 型     | 必須 |
| ---------- | ------ | ---- |
| `ownerKey` | string | 必須 |

### 4.8 `POST /v1/evaluations`

`multipart/form-data` で送信します。

| フィールド      | 型     | 必須 |
| --------------- | ------ | ---- |
| `ownerKey`      | string | 必須 |
| `sessionId`     | string | 必須 |
| `themeId`       | string | 必須 |
| `attemptNumber` | string | 必須 |
| `locale`        | string | 必須 |
| `audio`         | file   | 必須 |

前提:

- `session.theme.id === themeId`
- `session.attempts.length < 2`
- `attemptNumber` は次の回答順であること

## 5. 永続化

現在の D1 テーブルは次の 2 つです。

- `themes`
- `sessions`

どちらも owner 単位で保持します。

## 6. モバイル内部 I/F

- `apps/mobile/src/lib/storage.ts`
  - `createTheme(input)`
  - `getTheme(themeId)`
  - `listThemes()`
  - `createPracticeSession(theme)`
  - `getPracticeSession(sessionId)`
  - `listPracticeSessions()`

- `apps/mobile/src/lib/pending-recording-store.ts`
  - 解析待機画面へ渡す一時 payload を `sessionId` 単位で保持します

## 7. 補足

- 認証は未実装で、`ownerKey` による簡易な所有者識別のみです
- 旧 `profile / prompts / personalization` 契約は削除済みです
