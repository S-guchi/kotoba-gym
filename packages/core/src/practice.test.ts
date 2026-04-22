import { describe, expect, test } from "vitest";
import {
  AttemptEvaluationSchema,
  PracticePromptSchema,
  PracticeSessionRecordSchema,
  PreviousAttemptPayloadSchema,
  getPracticePromptById,
  practicePrompts,
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
const firstPrompt = getPracticePromptById("tech-api-cache");

describe.each(
  practicePrompts.map((prompt) => ({
    name: prompt.id,
    prompt,
  })),
)("PracticePromptSchema", (entry) => {
  test.each([{ label: "prompt schema parse" }])("$label", () => {
    expect(PracticePromptSchema.parse(entry.prompt)).toEqual(entry.prompt);
    expect(getPracticePromptById(entry.prompt.id)).toEqual(entry.prompt);
  });
});

describe.each([
  {
    name: "attempts over limit",
    input: {
      id: "session-1",
      prompt: firstPrompt,
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
    name: "unknown prompt id",
    promptId: "unknown",
  },
])("getPracticePromptById", ({ promptId }) => {
  test.each([{ label: "missing prompt throws" }])("$label", () => {
    expect(() => getPracticePromptById(promptId)).toThrow(
      `Practice prompt not found: ${promptId}`,
    );
  });
});
