import { describe, expect, test } from "vitest";
import {
  buildSessionTitle,
  formatDuration,
  getInputSupportMessage,
  getScriptModes,
} from "./session-flow";

describe.each([
  ["", "まずは一言だけでも大丈夫です。"],
  ["CI", "もう少しだけ材料があると整理しやすいです。"],
  ["CI導入について、今は手動で確認していて相談したいです", null],
])("getInputSupportMessage", (input, expectedPrefix) => {
  test("入力量に応じた補助文を返す", () => {
    const message = getInputSupportMessage(input);
    if (expectedPrefix === null) {
      expect(message).toBeNull();
    } else {
      expect(message?.startsWith(expectedPrefix)).toBe(true);
    }
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
