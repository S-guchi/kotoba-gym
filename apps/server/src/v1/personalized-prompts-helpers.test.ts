import type { PersonalizationProfile } from "@kotoba-gym/core";
import { describe, expect, test } from "vitest";
import {
  buildPersonalizedPromptsPrompt,
  createPersonalizedPromptId,
  normalizePersonalizedPrompts,
} from "./personalized-prompts-helpers.js";

const profile: PersonalizationProfile = {
  role: "モバイル",
  roleText: "React Native 中心です",
  strengths: ["実装速度"],
  strengthsText: "試作が速い",
  techStack: ["Expo", "TypeScript"],
  techStackText: "Supabase",
  scenarios: ["技術説明", "報連相"],
};

describe.each([
  {
    name: "prompt includes profile context",
    expectedSnippets: [
      "技術領域: モバイル（React Native 中心です）",
      "技術スタック: Expo、TypeScript、Supabase",
      "練習したい場面: 技術説明、報連相",
    ],
  },
])("buildPersonalizedPromptsPrompt", ({ expectedSnippets }) => {
  test.each([{ label: "generation prompt contains profile details" }])(
    "$label",
    () => {
      const prompt = buildPersonalizedPromptsPrompt(profile);
      expect(
        expectedSnippets.every((snippet) => prompt.includes(snippet)),
      ).toBe(true);
    },
  );
});

describe.each([
  {
    name: "id is deterministic",
    title: "Expo の強みを説明",
    index: 0,
    expected: "personalized-1-9isooc",
  },
])("createPersonalizedPromptId", ({ title, index, expected }) => {
  test.each([{ label: "personalized prompt id is stable" }])("$label", () => {
    expect(createPersonalizedPromptId(title, index)).toBe(expected);
  });
});

describe.each([
  {
    name: "drafts are normalized with ids and personalized flag",
    drafts: [
      {
        title: "Expo の強みを説明",
        prompt: "Expo 採用理由を説明してください。",
        situation: "相手は PM です。",
        goals: ["結論を先に言う", "採用理由を整理する"],
        category: "tech-explanation" as const,
        durationLabel: "45〜60秒" as const,
      },
    ],
    expected: [
      {
        id: "personalized-1-9isooc",
        title: "Expo の強みを説明",
        prompt: "Expo 採用理由を説明してください。",
        situation: "相手は PM です。",
        goals: ["結論を先に言う", "採用理由を整理する"],
        category: "tech-explanation",
        durationLabel: "45〜60秒",
        personalized: true,
      },
    ],
  },
])("normalizePersonalizedPrompts", ({ drafts, expected }) => {
  test.each([
    { label: "personalized prompts are normalized deterministically" },
  ])("$label", () => {
    expect(normalizePersonalizedPrompts(drafts)).toEqual(expected);
  });
});
