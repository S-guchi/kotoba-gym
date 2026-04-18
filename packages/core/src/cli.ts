import "dotenv/config";
import * as readline from "node:readline";
import { SessionConfigSchema } from "./schemas.js";
import { Session } from "./session.js";
import { getTopics } from "./topics/index.js";
import type { ChecklistItem, Feedback } from "./types.js";

function loadConfig() {
  return SessionConfigSchema.parse({
    maxTurns: Number(process.env.MAX_TURNS) || undefined,
    judgeTemperature: Number(process.env.JUDGE_TEMPERATURE) || undefined,
    personaTemperature: Number(process.env.PERSONA_TEMPERATURE) || undefined,
    logDir: process.env.LOG_DIR || undefined,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || undefined,
  });
}

function createRL(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer));
  });
}

function stateIcon(state: string): string {
  switch (state) {
    case "filled":
      return "[x]";
    case "partial":
      return "[~]";
    default:
      return "[ ]";
  }
}

function displayChecklist(checklist: ChecklistItem[]): void {
  const filled = checklist.filter((i) => i.state === "filled").length;
  console.log(`\n  進捗: ${filled}/${checklist.length} 項目クリア`);
}

function displayFeedback(feedback: Feedback, checklist: ChecklistItem[]): void {
  console.log(`\n${"=".repeat(50)}`);
  console.log("  セッション結果");
  console.log("=".repeat(50));

  console.log("\n--- チェックリスト ---");
  for (const item of checklist) {
    console.log(`  ${stateIcon(item.state)} ${item.label}`);
  }

  if (feedback.goodPoints.length > 0) {
    console.log("\n--- 良かった点 ---");
    for (const point of feedback.goodPoints) {
      console.log(`  「${point.quote}」`);
      console.log(`    → ${point.why}`);
    }
  }

  if (feedback.improvements.length > 0) {
    console.log("\n--- 改善点 ---");
    for (const imp of feedback.improvements) {
      console.log(`  ${imp.why}`);
      console.log(`    例: 「${imp.suggestionExample}」`);
    }
  }

  console.log("\n--- 総評 ---");
  console.log(`  ${feedback.summary}`);
  console.log();
}

async function main() {
  const config = loadConfig();
  const topics = getTopics();
  const rl = createRL();

  console.log("\n kotoba-gym - 言語化トレーニング\n");
  console.log("お題を選んでください:\n");

  for (const [i, topic] of topics.entries()) {
    console.log(`  ${i + 1}. ${topic.topicTitle}`);
  }

  const choice = await ask(rl, "\n番号を入力 > ");
  const index = Number.parseInt(choice, 10) - 1;
  const topic = topics[index];

  if (!topic) {
    console.log("無効な選択です。");
    rl.close();
    process.exit(1);
  }

  console.log(`\nお題: ${topic.topicTitle}`);
  console.log(`最大 ${config.maxTurns} ターンの会話です。\n`);

  const session = new Session(topic, config);

  // セッション開始
  const { openingMessage } = await session.start();
  console.log(`PM: ${openingMessage}\n`);

  // 対話ループ
  let ended = false;
  while (!ended) {
    const utterance = await ask(rl, "あなた > ");

    if (!utterance.trim()) continue;

    console.log("\n(考え中...)\n");
    const result = await session.userSay(utterance);

    console.log(`PM: ${result.reply}`);
    displayChecklist(result.checklist);
    console.log();

    ended = result.isEnded;
  }

  // フィードバック生成
  console.log("\n(フィードバックを生成中...)\n");
  const feedback = await session.finalize();
  const snapshot = session.toJSON();
  displayFeedback(feedback, snapshot.checklist);

  rl.close();
}

main().catch((err) => {
  console.error("エラーが発生しました:", err);
  process.exit(1);
});
