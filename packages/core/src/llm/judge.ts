import { Type } from "@google/genai";
import { JudgeResultSchema } from "../schemas.js";
import type {
  AcousticObservation,
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
  latestUtterance: string,
): string {
  const checklistText = currentChecklist
    .map(
      (item) =>
        `- [${item.id}] ${item.label}（${item.description}）: 現在の状態 = ${item.state}`,
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

function buildJudgeAudioPrompt(
  topic: Topic,
  currentChecklist: ChecklistItem[],
  history: ConversationMessage[],
  transcriptHint?: string,
): string {
  const checklistText = currentChecklist
    .map(
      (item) =>
        `- [${item.id}] ${item.label}（${item.description}）: 現在の状態 = ${item.state}`,
    )
    .join("\n");

  const historyText =
    history.length > 0
      ? history
          .map((m) => `${m.role === "user" ? "ユーザー" : "PM"}: ${m.content}`)
          .join("\n")
      : "まだ会話は始まっていません。";

  const hintText = transcriptHint
    ? `\n## ブラウザ字幕の参考文字起こし（誤りを含む可能性あり）\n${transcriptHint}`
    : "";

  return `あなたはチェックリスト評価と音響観察の専門家です。添付された直近のユーザー音声を厳格に評価してください。

## お題
${topic.topicTitle}

## チェックリスト（現在の状態）
${checklistText}

## これまでの会話
${historyText}${hintText}

## 評価ルール
1. 添付音声の直近ユーザー発話で **新しく具体的な情報が提供された** 項目のみ状態を更新してください。
2. 状態の基準:
   - empty: まったく触れられていない
   - partial: 言及はあるが、具体的な数字・名前・例・明確な根拠が不足している。「〜だと思う」「なんとなく」のような曖昧な表現はpartialです。
   - filled: 具体的な詳細（数字、固有名、実例、明確な論理）が述べられている
3. **甘く判定しないでください。** 具体性のない一般論はpartialです。filledには必ず具体的根拠が必要です。
4. 現在 filled の項目は、ユーザーが明確に撤回・矛盾する発言をしない限り filled のままにしてください。
5. 状態が変わる項目のみ updates に含めてください。変化がなければ空配列を返してください。
6. transcript には、音声から聞き取れたユーザー発話を日本語で自然に文字起こししてください。
7. acousticObservations には、フィラー、長い間、自信のなさ、歯切れの良さなど、フィードバックに使える観察だけを最大3件で入れてください。

## 出力形式
JSON形式で transcript, updates, acousticObservations を返してください。`;
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
    transcript: { type: Type.STRING },
    acousticObservations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: [
              "filler",
              "long_pause",
              "unclear_pronunciation",
              "confident",
              "hesitant",
            ],
          },
          context: { type: Type.STRING },
          note: { type: Type.STRING },
        },
        required: ["type", "context", "note"],
      },
    },
  },
  required: ["updates"],
};

function withoutFilledDowngrades(
  currentChecklist: ChecklistItem[],
  result: JudgeResult,
): JudgeResult {
  const filledIds = new Set(
    currentChecklist
      .filter((item) => item.state === "filled")
      .map((item) => item.id),
  );

  return {
    ...result,
    updates: result.updates.filter((update) => {
      if (filledIds.has(update.id) && update.newState !== "filled") {
        return false;
      }
      return true;
    }),
  };
}

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
    params.latestUtterance,
  );

  const raw = await params.client.generate(prompt, {
    temperature: params.temperature,
    responseSchema: JUDGE_RESPONSE_SCHEMA,
  });

  const parsed = JudgeResultSchema.parse(JSON.parse(raw));

  return withoutFilledDowngrades(params.currentChecklist, parsed);
}

export async function evaluateChecklistFromAudio(params: {
  topic: Topic;
  currentChecklist: ChecklistItem[];
  history: ConversationMessage[];
  audio: Buffer;
  mimeType: string;
  transcriptHint?: string;
  client: LLMClient;
  temperature: number;
}): Promise<JudgeResult & { acousticObservations: AcousticObservation[] }> {
  const prompt = buildJudgeAudioPrompt(
    params.topic,
    params.currentChecklist,
    params.history,
    params.transcriptHint,
  );

  const raw = await params.client.generateParts(
    [
      { text: prompt },
      {
        inlineData: {
          mimeType: params.mimeType,
          data: params.audio.toString("base64"),
        },
      },
    ],
    {
      temperature: params.temperature,
      responseSchema: JUDGE_RESPONSE_SCHEMA,
      thinkingLevel: "low",
    },
  );

  const parsed = JudgeResultSchema.parse(JSON.parse(raw));
  return withoutFilledDowngrades(params.currentChecklist, parsed);
}
