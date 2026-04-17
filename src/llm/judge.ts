import { Type } from "@google/genai";
import { JudgeResultSchema } from "../schemas.js";
import type {
  ChecklistItem,
  ConversationMessage,
  JudgeResult,
  Topic,
} from "../types.js";
import type { LLMClient } from "./client.js";

function buildJudgePrompt(
  topic: Topic,
  currentChecklist: ChecklistItem[],
  history: ConversationMessage[],
  latestUtterance: string
): string {
  const checklistText = currentChecklist
    .map(
      (item) =>
        `- [${item.id}] ${item.label}（${item.description}）: 現在の状態 = ${item.state}`
    )
    .join("\n");

  const historyText = history
    .map((m) => `${m.role === "user" ? "ユーザー" : "PM"}: ${m.content}`)
    .join("\n");

  return `あなたはチェックリスト評価の専門家です。ユーザーの発言を厳格に評価してください。

## お題
${topic.topicTitle}

## チェックリスト（現在の状態）
${checklistText}

## これまでの会話
${historyText}

## 直近のユーザー発言（評価対象）
${latestUtterance}

## 評価ルール
1. 直近のユーザー発言で **新しく具体的な情報が提供された** 項目のみ状態を更新してください。
2. 状態の基準:
   - empty: まったく触れられていない
   - partial: 言及はあるが、具体的な数字・名前・例・明確な根拠が不足している。「〜だと思う」「なんとなく」のような曖昧な表現はpartialです。
   - filled: 具体的な詳細（数字、固有名、実例、明確な論理）が述べられている
3. **甘く判定しないでください。** 具体性のない一般論はpartialです。filledには必ず具体的根拠が必要です。
4. 現在 filled の項目は、ユーザーが明確に撤回・矛盾する発言をしない限り filled のままにしてください。
5. 状態が変わる項目のみ updates に含めてください。変化がなければ空配列を返してください。

## 出力形式
JSON形式で、各更新項目のid, newState, reason（判定理由を日本語で簡潔に）を返してください。`;
}

const JUDGE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    updates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          newState: { type: Type.STRING, enum: ["empty", "partial", "filled"] },
          reason: { type: Type.STRING },
        },
        required: ["id", "newState", "reason"],
      },
    },
  },
  required: ["updates"],
};

export async function evaluateChecklist(params: {
  topic: Topic;
  currentChecklist: ChecklistItem[];
  history: ConversationMessage[];
  latestUtterance: string;
  client: LLMClient;
  temperature: number;
}): Promise<JudgeResult> {
  const prompt = buildJudgePrompt(
    params.topic,
    params.currentChecklist,
    params.history,
    params.latestUtterance
  );

  const raw = await params.client.generate(prompt, {
    temperature: params.temperature,
    responseSchema: JUDGE_RESPONSE_SCHEMA,
  });

  const parsed = JudgeResultSchema.parse(JSON.parse(raw));

  // filled→downgrade 禁止: コード側で強制
  const filledIds = new Set(
    params.currentChecklist
      .filter((item) => item.state === "filled")
      .map((item) => item.id)
  );

  return {
    updates: parsed.updates.filter((update) => {
      if (filledIds.has(update.id) && update.newState !== "filled") {
        return false;
      }
      return true;
    }),
  };
}
