import type {
  ChecklistItem,
  ConversationMessage,
  Topic,
} from "../types.js";
import type { LLMClient } from "./client.js";

function describeUnfilledItems(checklist: ChecklistItem[]): string {
  const unfilled = checklist.filter((item) => item.state !== "filled");
  if (unfilled.length === 0) return "すべての知りたいことは十分に聞けた。";

  return unfilled
    .map((item) => {
      const status = item.state === "empty" ? "まだ聞けていない" : "もう少し具体的に知りたい";
      return `- ${item.description}（${status}）`;
    })
    .join("\n");
}

function buildSystemPrompt(
  topic: Topic,
  checklist: ChecklistItem[],
  turnNumber: number,
  maxTurns: number
): string {
  const unfilledText = describeUnfilledItems(checklist);
  const allFilled = checklist.every((item) => item.state === "filled");
  const isNearEnd = turnNumber >= maxTurns - 2;

  let situationHint = "";
  if (allFilled) {
    situationHint =
      "あなたは説明に十分納得しました。自然に会話をまとめて締めてください。";
  } else if (isNearEnd) {
    situationHint =
      "会話がもうすぐ終わります。最も重要な未解決の疑問を優先して聞いてください。";
  }

  return `あなたは中規模BtoB SaaS企業のPMです。元エンジニアで技術的な話も理解できます。
今、エンジニアとの1on1で「${topic.topicTitle}」について話を聞いています。

## あなたの行動ルール
1. 1回の返答で質問は1つだけにする（複数のことを同時に聞かない）
2. 理解したことは短く言い換えて確認する（「つまり〇〇ってこと？」）
3. 曖昧な説明には具体化を求める（「もう少し具体的に言うと？」「例えばどういうケース？」）
4. 口調は丁寧だがフランク、社内1on1の温度感
5. 日本語で返答する

## あなたがまだ知りたいこと
${unfilledText}

${situationHint}

現在 ${turnNumber}/${maxTurns} ターン目です。`;
}

function formatHistory(history: ConversationMessage[]): string {
  return history
    .map((m) => `${m.role === "user" ? "エンジニア" : "PM"}: ${m.content}`)
    .join("\n");
}

export async function generateOpeningMessage(
  topic: Topic,
  client: LLMClient,
  temperature: number
): Promise<string> {
  const systemPrompt = `あなたは中規模BtoB SaaS企業のPMです。元エンジニアで技術的な話も理解できます。
今からエンジニアとの1on1で「${topic.topicTitle}」について話を聞きます。

自然な切り出しの一言で会話を始めてください。
- カジュアルで親しみやすいトーン
- 「じゃあ聞かせて」的な雰囲気
- 1〜2文程度
- 日本語で`;

  return client.generate(
    "1on1を始めてください。最初の一言をお願いします。",
    { systemPrompt, temperature }
  );
}

export async function generatePMResponse(params: {
  topic: Topic;
  checklist: ChecklistItem[];
  history: ConversationMessage[];
  turnNumber: number;
  maxTurns: number;
  client: LLMClient;
  temperature: number;
}): Promise<string> {
  const systemPrompt = buildSystemPrompt(
    params.topic,
    params.checklist,
    params.turnNumber,
    params.maxTurns
  );

  const historyText = formatHistory(params.history);

  return params.client.generate(
    `これまでの会話:\n${historyText}\n\nPMとして次の返答をしてください。`,
    { systemPrompt, temperature: params.temperature }
  );
}
