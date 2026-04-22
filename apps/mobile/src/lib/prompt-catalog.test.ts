import { describe, expect, test } from "vitest";
import type { PersonalizedPracticePrompt } from "@kotoba-gym/core";
import { findPromptById } from "./prompt-catalog";

const personalizedPrompt: PersonalizedPracticePrompt = {
  id: "personal-1",
  category: "design-decision",
  title: "Expo 選定理由",
  prompt: "Expo を選んだ理由を説明してください。",
  situation: "PM に意思決定を説明する場面です。",
  goals: ["判断軸を示す", "代替案と比較する"],
  durationLabel: "60〜90秒",
  personalized: true,
};

describe.each([
  {
    label: "個人化お題が優先される",
    promptId: "personal-1",
    expected: personalizedPrompt,
  },
  {
    label: "存在しない場合は null を返す",
    promptId: "missing",
    expected: null,
  },
])("$label", ({ promptId, expected }) => {
  test.each([{ label: "prompt id から解決できる" }])("$label", () => {
    expect(
      findPromptById({
        prompts: [personalizedPrompt],
        promptId,
      }),
    ).toEqual(expected);
  });
});
