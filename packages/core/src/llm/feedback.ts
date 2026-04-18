import { Type } from "@google/genai";
import { FeedbackSchema } from "../schemas.js";
import type {
  AcousticObservation,
  ChecklistItem,
  ConversationMessage,
  Feedback,
  Topic,
} from "../types.js";
import type { LLMClient } from "./client.js";

function buildFeedbackPrompt(
  topic: Topic,
  finalChecklist: ChecklistItem[],
  history: ConversationMessage[],
  acousticObservations: AcousticObservation[],
): string {
  const checklistText = finalChecklist
    .map(
      (item) =>
        `- [${item.id}] ${item.label}（${item.description}）: 最終状態 = ${item.state}`,
    )
    .join("\n");

  const historyText = history
    .map((m) => `${m.role === "user" ? "ユーザー" : "PM"}: ${m.content}`)
    .join("\n");

  const acousticText =
    acousticObservations.length > 0
      ? acousticObservations
          .map((o) => `- ${o.type}: ${o.context} / ${o.note}`)
          .join("\n")
      : "音響観察はありません。";

  return `以下の会話セッションのフィードバックを生成してください。

## お題
${topic.topicTitle}

## チェックリスト結果
${checklistText}

## 会話全文
${historyText}

## 音響観察
${acousticText}

## フィードバック要件

### goodPoints（最大2個）
- ユーザーの **実際の発言を引用** して、なぜそれが効果的だったかを説明
- 具体的にどの発言がPMの理解を助けたか

### improvements（最大2個）
- 未充足（empty/partial）の項目について改善提案
- **ユーザーの文脈に即した具体的な言い換え例文** を提示（汎用アドバイスは不可）
- missingItemId にはチェックリストのidを入れる
- suggestionExample には「こう言えばよかった」の具体的な例文を入れる
- 音響観察がある場合は、自然に1つだけ混ぜてください（例: 間が長かった箇所、歯切れが良かった箇所）

### summary
- 2〜3行の総評
- 励まし基調で、次に何を意識すればいいか分かる内容`;
}

const FEEDBACK_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    goodPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          why: { type: Type.STRING },
        },
        required: ["quote", "why"],
      },
    },
    improvements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          missingItemId: { type: Type.STRING },
          suggestionExample: { type: Type.STRING },
          why: { type: Type.STRING },
        },
        required: ["missingItemId", "suggestionExample", "why"],
      },
    },
    summary: { type: Type.STRING },
  },
  required: ["goodPoints", "improvements", "summary"],
};

export async function generateFeedback(params: {
  topic: Topic;
  finalChecklist: ChecklistItem[];
  history: ConversationMessage[];
  acousticObservations?: AcousticObservation[];
  client: LLMClient;
  temperature: number;
}): Promise<Feedback> {
  const prompt = buildFeedbackPrompt(
    params.topic,
    params.finalChecklist,
    params.history,
    params.acousticObservations ?? [],
  );

  const raw = await params.client.generate(prompt, {
    temperature: params.temperature,
    responseSchema: FEEDBACK_RESPONSE_SCHEMA,
  });

  return FeedbackSchema.parse(JSON.parse(raw));
}
