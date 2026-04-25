import type {
  GeneratedScript,
  MaterialItem,
  RehearsalResult,
  SessionRecord,
} from "@kotoba-gym/core";

export function getInputSupportMessage(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return "まずは一言だけでも大丈夫です。「何について整理したいか」だけ教えてください。";
  }
  if (trimmed.length < 20) {
    return "もう少しだけ材料があると整理しやすいです。何に困っているか、誰に伝えたいかも足してみてください。";
  }
  return null;
}

export function buildSessionTitle(text: string) {
  const firstLine = text.trim().split(/\n/)[0]?.trim();
  if (firstLine) {
    return firstLine.slice(0, 24);
  }

  return "新しい整理";
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function hasEmptyMaterial(items: MaterialItem[]) {
  return items.some((item) => !item.content.trim());
}

export function canRequestFeedback(session: SessionRecord) {
  return Boolean(
    session.selectedConclusion &&
      session.speechPlan &&
      session.script &&
      session.rehearsal?.recorded,
  );
}

export function buildRehearsalResult(durationSeconds: number): RehearsalResult {
  return {
    recorded: true,
    durationSeconds,
    recordedAt: new Date().toISOString(),
  };
}

export function getScriptModes(script: GeneratedScript) {
  return [
    { label: "30秒版", value: script.thirtySecond },
    script.oneMinute ? { label: "1分版", value: script.oneMinute } : null,
    script.slackMessage
      ? { label: "Slack文面", value: script.slackMessage }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
}
