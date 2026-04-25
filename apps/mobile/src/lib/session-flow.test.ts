import { describe, expect, test } from "vitest";
import {
  buildSessionTitle,
  formatDuration,
  getHomeRecordingMessage,
  getScriptModes,
  hasDraftInput,
} from "./session-flow";

describe.each([
  ["", false],
  ["   ", false],
  ["相談したい", true],
])("hasDraftInput", (input, expected) => {
  test("入力済みかどうかを返す", () => {
    expect(hasDraftInput(input)).toBe(expected);
  });
});

describe.each([
  [
    { isRecording: true, isTranscribing: false, hasRecordedAudio: false },
    "録音中",
  ],
  [
    { isRecording: false, isTranscribing: true, hasRecordedAudio: false },
    "文字起こし中",
  ],
  [
    { isRecording: false, isTranscribing: false, hasRecordedAudio: true },
    "文字起こしを確認できます",
  ],
  [
    { isRecording: false, isTranscribing: false, hasRecordedAudio: false },
    null,
  ],
])("getHomeRecordingMessage", (state, expected) => {
  test("録音状態に応じた短い表示文を返す", () => {
    expect(getHomeRecordingMessage(state)).toBe(expected);
  });
});

describe.each([
  ["CI導入について相談したい\n詳細", "CI導入について相談したい"],
  ["", "新しい整理"],
])("buildSessionTitle", (input, expected) => {
  test("セッションタイトルを作る", () => {
    expect(buildSessionTitle(input)).toBe(expected);
  });
});

describe.each([
  [0, "00:00"],
  [18, "00:18"],
  [75, "01:15"],
])("formatDuration", (seconds, expected) => {
  test("秒数を mm:ss に変換する", () => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe.each([
  [{ thirtySecond: "短い", keywords: ["CI"] }, ["30秒版"]],
  [
    {
      thirtySecond: "短い",
      oneMinute: "長い",
      slackMessage: "Slack",
      keywords: ["CI"],
    },
    ["30秒版", "1分版", "Slack文面"],
  ],
])("getScriptModes", (script, expectedLabels) => {
  test("表示できる説明文モードを返す", () => {
    expect(getScriptModes(script).map((mode) => mode.label)).toEqual(
      expectedLabels,
    );
  });
});
