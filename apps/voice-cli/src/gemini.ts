import { GoogleGenAI } from "@google/genai";

interface Message {
  role: "user" | "model";
  text: string;
}

let ai: GoogleGenAI;
let model: string;

const SYSTEM_PROMPT = `あなたは中規模BtoB SaaS企業のPMです。元エンジニアで技術的な話も理解できます。
今、エンジニアとの1on1で「最近担当したCI改善の提案」について話を聞いています。

## ルール
1. 返答は2〜3文以内、質問は1つだけ
2. 理解したことは短く言い換えて確認する（「つまり〇〇ってこと？」）
3. 曖昧な説明には具体化を求める（「もう少し具体的に言うと？」「例えばどういうケース？」）
4. 口調は丁寧だがフランク、社内1on1の温度感
5. 日本語で返答する`;

export function initGemini(apiKey: string, modelName: string): void {
  ai = new GoogleGenAI({ apiKey });
  model = modelName;
}

export async function* streamResponse(
  audioBuffer: Buffer,
  history: Message[],
): AsyncIterable<string> {
  const contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  }> = [];

  // Add conversation history as text
  for (const msg of history) {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.text }],
    });
  }

  // Add current audio as user message
  contents.push({
    role: "user",
    parts: [
      {
        inlineData: {
          mimeType: "audio/wav",
          data: audioBuffer.toString("base64"),
        },
      },
    ],
  });

  const response = await ai.models.generateContentStream({
    model,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.7,
    },
    contents,
  });

  for await (const chunk of response) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

export type { Message };
