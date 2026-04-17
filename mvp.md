# kotoba-gym Phase 0a 仕様書 (TypeScript版)

## 1. プロジェクト概要

エンジニアの言語化力を鍛える対話型練習サービス。AI面接官/PM/主婦などのペルソナと会話し、「相手が知りたいことをどれだけ埋められたか」「すれ違いをどれだけ修正できたか」をゲーミフィケーションで練習する。

就活サービスなどに紐づかず、純粋に練習に集中できることが差別化点。

## 2. Phase 0a のゴール

**検証対象: AIの頭脳が体験として成立するか**

- PMペルソナがまともな質問を返してくるか
- 隠しチェックリストの判定が安定するか
- セッション後フィードバックが学びに繋がるか

UI・音声・キャラクター表示は対象外。CLIでテキスト対話のみ。

## 3. 非ゴール(このフェーズではやらない)

- Web UI / アプリUI
- 音声入出力 (STT / TTS)
- PNGtuber的キャラクター表示
- 理解度ゲージの可視化
- 複数ペルソナ対応(PMのみ)
- ユーザー入力お題(プリセットのみ)
- DB永続化(ログはファイル保存でOK)

## 4. 技術スタック

- **ランタイム**: Node.js 20+ (LTS)
- **言語**: TypeScript 5.x
- **パッケージマネージャ**: pnpm(好みで npm / yarn でもOK)
- **LLM**: Google Gemini API (`@google/generative-ai` SDK、モデルは環境変数で差し替え可能)
- **スキーマ検証**: Zod(LLM出力の構造化・検証)
- **実行**: `tsx` で TS を直接実行(開発速度優先)
- **テスト**: Vitest
- **Lint/Format**: Biome 推奨(設定ほぼ不要) or ESLint + Prettier
- **CLI**: 標準入出力でシンプルに(必要なら `@inquirer/prompts`)
- **ログ**: セッションごとに JSON ファイルで保存

Phase 0b 以降で Web 化することを見据え、**コアロジックを CLI から切り離せる構造**にする(後述のファイル構成参照)。

## 5. PMペルソナ仕様

### キャラクター設定

- 中規模 BtoB SaaS 企業の PM
- 技術バックグラウンドあり(元エンジニアという設定)
- 意思決定に必要な情報を引き出そうとする姿勢
- 曖昧な説明には具体化を求める
- 口調: 丁寧だがフランク、社内1on1の温度感

### 行動原則(システムプロンプトに含める)

1. ユーザーの発言から「何が埋まっていないか」を察知し、次の質問で埋めにいく
2. 一度に複数のことを聞かない(1質問1論点)
3. 理解したことは短く言い換えて確認する("つまり〇〇ってこと?")
4. 会話の終盤では、埋まっていない重要項目を優先的に聞く
5. 終了時は自然にまとめて締める

## 6. チェックリスト仕様

### 構造(Zod スキーマで定義)

お題ごとに「PMが知りたい項目」を6個固定で持つ。

```ts
import { z } from "zod";

export const ChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  state: z.enum(["empty", "partial", "filled"]).default("empty"),
});

export const TopicSchema = z.object({
  topicId: z.string(),
  topicTitle: z.string(),
  checklist: z.array(ChecklistItemSchema).length(6),
});
```

### 初期データ例

```ts
{
  topicId: "ci-improvement",
  topicTitle: "最近担当したCI改善の提案",
  checklist: [
    { id: "problem",  label: "解決したい課題",   description: "現状の何が問題だったか、具体的な痛み", state: "empty" },
    { id: "impact",   label: "影響範囲と規模感", description: "誰が・どれくらい困っていたか", state: "empty" },
    { id: "solution", label: "提案した解決策",   description: "具体的に何をしたか/するか", state: "empty" },
    { id: "metrics",  label: "成果指標",         description: "何をもって成功とするか、定量的な指標", state: "empty" },
    { id: "cost",     label: "実現コスト",       description: "工数・技術的難易度・リスク", state: "empty" },
    { id: "priority", label: "優先度の根拠",     description: "なぜ今これをやるべきか", state: "empty" },
  ],
}
```

### 状態管理

各項目は以下の3状態:

- `empty`: 一度も触れられていない
- `partial`: 言及はあるが具体性・明確性が不足
- `filled`: 十分に埋まった

## 7. 会話フロー

```
1. セッション開始
   └ お題をユーザーに提示
   └ PMの最初の一言("じゃあ聞かせて"的な切り出し)

2. 対話ループ (最大 8ターン または 全項目 filled で終了)
   └ ユーザー発話
   └ 評価ロジック実行(裏でチェックリスト更新)
   └ PMの返答生成
     └ 直近のユーザー発話を踏まえる
     └ 未充足項目を優先的に聞く(最終盤は特に)

3. セッション終了
   └ PMが自然に会話を締める
   └ フィードバック画面へ
```

### 時間設計

- 目安 3分 / 実装上は**ターン数で管理**(1ターン ≒ 20〜30秒想定で最大8ターン)
- `MAX_TURNS` を環境変数で変えられるように

## 8. 評価ロジック

### 毎ターンの裏処理

ユーザー発話ごとに、Gemini に**PM返答生成とは別コール**で問い合わせる。

**入力**:
- お題
- チェックリスト(現状 state 込み)
- 会話履歴
- 直近のユーザー発話

**出力(Zod で検証する JSON)**:
```ts
export const JudgeResultSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    newState: z.enum(["empty", "partial", "filled"]),
    reason: z.string(),
  })),
});
```

Gemini の `responseSchema` オプションまたは `responseMimeType: "application/json"` で JSON を強制し、受け取り後に Zod で parse する(LLM出力を信用しないのが鉄則)。

### 安定化の工夫

- 一度 `filled` になった項目はユーザーが明確に撤回しない限り戻さない(アプリ側のロジックで制御)
- judge 用のプロンプトに「甘めに判定しない、具体性を見る」と明記
- temperature は低め(0.2 前後)

## 9. フィードバック仕様

セッション終了後にLLMで生成。

### 画面(CLI出力)項目

1. **チェックリスト結果**: 各項目の最終 state を表示
2. **良かった点**: 1〜2個、具体的にどの発言が効いたか
3. **改善点**: 1〜2個、未充足項目に対して「こう言えばもっと伝わった」の例文付き
4. **総評**: 2〜3行、励まし基調

改善点の例文は**ユーザーの文脈に即した具体的な言い換え**を生成する(汎用アドバイスにしない)。

```ts
export const FeedbackSchema = z.object({
  goodPoints: z.array(z.object({ quote: z.string(), why: z.string() })).max(2),
  improvements: z.array(z.object({
    missingItemId: z.string(),
    suggestionExample: z.string(),
    why: z.string(),
  })).max(2),
  summary: z.string(),
});
```

## 10. ファイル構成案

```
kotoba-gym/
├── README.md
├── package.json
├── tsconfig.json
├── biome.json
├── .env.example              # GEMINI_API_KEY など
├── .gitignore
├── src/
│   ├── cli.ts                # CLIエントリポイント
│   ├── session.ts            # セッション状態管理(UI非依存)
│   ├── llm/
│   │   ├── client.ts         # Gemini APIラッパ
│   │   ├── persona.ts        # PMプロンプト生成 + 返答生成
│   │   ├── judge.ts          # チェックリスト判定
│   │   └── feedback.ts       # フィードバック生成
│   ├── topics/
│   │   ├── index.ts
│   │   └── presets.ts        # お題プリセット
│   ├── schemas.ts            # Zodスキーマ集約
│   └── types.ts              # 型定義
├── logs/                     # セッションログ出力先(gitignore)
└── tests/
    └── judge.test.ts         # 判定ロジックのスナップショット的テスト
```

**重要**: `session.ts` は CLI 非依存にする。Phase 0b 以降で Fastify / Hono / Express から同じ関数を呼べる構造にする。

### session.ts の API イメージ

```ts
export class Session {
  constructor(topic: Topic, config: SessionConfig);
  async start(): Promise<{ openingMessage: string }>;
  async userSay(utterance: string): Promise<{
    reply: string;
    checklist: ChecklistItem[];
    isEnded: boolean;
  }>;
  async finalize(): Promise<Feedback>;
  toJSON(): SessionSnapshot;
}
```

入出力が明確なら、CLI でも Web でも上に被せるだけで済む。

## 11. package.json 想定

```json
{
  "name": "kotoba-gym",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsc",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "biome check src",
    "format": "biome format --write src"
  },
  "dependencies": {
    "@google/generative-ai": "latest",
    "zod": "^3",
    "dotenv": "^16"
  },
  "devDependencies": {
    "tsx": "^4",
    "typescript": "^5",
    "vitest": "^2",
    "@biomejs/biome": "^1",
    "@types/node": "^20"
  }
}
```

※ バージョンは目安、インストール時は `latest` を確認。

## 12. お題プリセット(初期3個)

1. **ci-improvement**: 最近担当したCI改善の提案
2. **tech-debt**: チームで抱えている技術的負債と対処方針
3. **tool-introduction**: 導入したい開発ツール(AI活用ツール等)の提案

いずれも「PMに説明して合意を取る」シチュエーション想定。

## 13. 動作確認基準(このフェーズの完了定義)

以下を全て満たせば Phase 0a 完了:

- [ ] CLI で 3 お題とも最後まで会話が通る
- [ ] PMの質問が文脈に沿っており、繰り返しや場当たりでない
- [ ] チェックリスト判定が2回連続プレイで大きくブレない
- [ ] フィードバックが「自分が次に何を気をつければいいか」分かる粒度で出る
- [ ] Shoya本人が遊んで「これ続けたら言語化うまくなりそう」と感じる

最後の基準が一番大事。数値では測れないので、素直に自分の手応えで判断すること。

## 14. 環境変数

`.env.example`:

```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3-flash
MAX_TURNS=8
JUDGE_TEMPERATURE=0.2
PERSONA_TEMPERATURE=0.7
LOG_DIR=./logs
```

## 15. 将来拡張への配慮(今は作らないが塞がない)

- `session.ts` は `toJSON()` でシリアライズ可能にしておく → Web化時にそのままレスポンスに載る
- ペルソナは `persona.ts` 内で差し替え可能な構造にする → 面接官/主婦の追加に備える
- チェックリストはお題と分離 → 後でLLM動的生成に置き換え可能
- ログ出力は会話 + 判定結果 + フィードバックを1JSONに → 後で学習履歴UIを作るときの元データになる
- Gemini クライアントは薄くラップ → モデル変更・プロバイダ差し替え(Claude/OpenAI)にも耐える

---

**この仕様書は Phase 0a のみを対象とする。Phase 0b(音声ループ検証)以降は別仕様書で扱う。**
