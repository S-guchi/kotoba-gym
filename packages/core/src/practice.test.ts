import { describe, expect, test } from "vitest";
import {
  AttemptEvaluationSchema,
  GeneratePersonalizedPromptsResponseSchema,
  PersonalizationProfileSchema,
  PersonalizedPracticePromptSchema,
  PracticePromptSchema,
  PracticeSessionRecordSchema,
  PreviousAttemptPayloadSchema,
  scoreAxes,
} from "./index.js";

const baseScores = scoreAxes.map((axis, index) => ({
  axis,
  score: Math.min(index + 1, 5),
  comment: `${axis} comment`,
}));

const baseEvaluation = {
  transcript: "結論から説明します。",
  summary: "結論先出しはできています。",
  scores: baseScores,
  goodPoints: ["結論が先", "短くまとまっている"],
  improvementPoints: ["具体例が不足", "数字がない"],
  exampleAnswer: "まず結論、次に背景、最後に効果を説明します。",
  nextFocus: "具体例を一つ入れてください。",
  comparison: null,
};
const practicePrompt = {
  id: "prompt-1",
  category: "tech-explanation" as const,
  title: "API キャッシュ戦略の説明",
  prompt:
    "新しく入ったメンバーに、なぜ API レスポンスのキャッシュ戦略を見直したのか説明してください。",
  background:
    "最近アクセス数が増え、一部 API の平均応答時間が悪化していました。特に商品一覧 API はピーク時に 900ms 前後まで遅くなっていたため、キャッシュ対象と TTL を見直しました。",
  situation:
    "相手はバックエンド経験が浅く、結論先出しで要点を知りたがっています。",
  goals: ["最初に結論を置く", "現状の問題と改善後の違いを分けて話す"],
  durationLabel: "60〜90秒" as const,
};

const personalizedPrompt = {
  ...practicePrompt,
  id: "personalized-1",
  personalized: true as const,
};

describe.each(
  [practicePrompt].map((prompt) => ({
    name: prompt.id,
    prompt,
  })),
)("PracticePromptSchema", (entry) => {
  test.each([{ label: "prompt schema parse" }])("$label", () => {
    expect(PracticePromptSchema.parse(entry.prompt)).toEqual(entry.prompt);
  });
});

describe.each([
  {
    name: "personalized prompt parses",
    input: personalizedPrompt,
  },
])("PersonalizedPracticePromptSchema", ({ input }) => {
  test.each([{ label: "personalized prompt schema parse" }])("$label", () => {
    expect(PersonalizedPracticePromptSchema.parse(input)).toEqual(input);
  });
});

describe.each([
  {
    name: "attempts over limit",
    input: {
      id: "session-1",
      prompt: personalizedPrompt,
      attempts: [
        {
          attemptNumber: 1,
          recordedAt: "2026-04-22T00:00:00.000Z",
          evaluation: baseEvaluation,
        },
        {
          attemptNumber: 2,
          recordedAt: "2026-04-22T00:01:00.000Z",
          evaluation: baseEvaluation,
        },
        {
          attemptNumber: 3,
          recordedAt: "2026-04-22T00:02:00.000Z",
          evaluation: baseEvaluation,
        },
      ],
      createdAt: "2026-04-22T00:00:00.000Z",
      updatedAt: "2026-04-22T00:02:00.000Z",
    },
  },
  {
    name: "missing score axis",
    input: {
      ...baseEvaluation,
      scores: baseScores.slice(0, 4),
    },
  },
])("schema validation failures", ({ input }) => {
  test.each([{ label: "invalid payload is rejected" }])("$label", () => {
    const parse =
      "attempts" in input
        ? () => PracticeSessionRecordSchema.parse(input)
        : () => AttemptEvaluationSchema.parse(input);

    expect(parse).toThrow();
  });
});

describe.each([
  {
    name: "previous payload strips comparison",
    input: {
      attemptNumber: 1,
      transcript: baseEvaluation.transcript,
      summary: baseEvaluation.summary,
      scores: baseEvaluation.scores,
      goodPoints: baseEvaluation.goodPoints,
      improvementPoints: baseEvaluation.improvementPoints,
      nextFocus: baseEvaluation.nextFocus,
    },
  },
])("PreviousAttemptPayloadSchema", ({ input }) => {
  test.each([{ label: "payload parse succeeds" }])("$label", () => {
    expect(PreviousAttemptPayloadSchema.parse(input)).toEqual(input);
  });
});

describe.each([
  {
    name: "personalization profile parses with free text",
    input: {
      role: "モバイル",
      roleText: "React Native 中心です",
      strengths: ["実装速度"],
      strengthsText: "試作が速い",
      techStack: ["Expo", "TypeScript"],
      techStackText: "Supabase",
      scenarios: ["技術説明", "報連相"],
    },
  },
])("PersonalizationProfileSchema", ({ input }) => {
  test.each([{ label: "profile schema parse succeeds" }])("$label", () => {
    expect(PersonalizationProfileSchema.parse(input)).toEqual(input);
  });
});

describe.each([
  {
    name: "personalized prompts response parses",
    input: {
      prompts: Array.from({ length: 5 }, (_, index) => ({
        ...personalizedPrompt,
        id: `personalized-${index + 1}`,
        personalized: true as const,
      })),
    },
  },
])("GeneratePersonalizedPromptsResponseSchema", ({ input }) => {
  test.each([{ label: "personalized prompt schema parse succeeds" }])(
    "$label",
    () => {
      expect(GeneratePersonalizedPromptsResponseSchema.parse(input)).toEqual(
        input,
      );
    },
  );
});
