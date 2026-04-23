import { describe, expect, test } from "vitest";
import {
  AttemptEvaluationSchema,
  CreateThemeRequestSchema,
  CreateThemeResponseSchema,
  ListThemesResponseSchema,
  PracticeSessionRecordSchema,
  PreviousAttemptPayloadSchema,
  ThemeRecordSchema,
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

const themeRecord = {
  id: "theme-1",
  title: "API キャッシュ戦略を説明する",
  userInput: {
    theme: "API キャッシュ戦略を見直した理由",
    audience: "新メンバー",
    goal: "設計意図を誤解なく理解してほしい",
  },
  mission:
    "新メンバーに、キャッシュ戦略を見直した理由と設計意図が伝わるように説明してください。",
  audienceSummary: "相手は背景知識が浅く、結論から短く知りたがっています。",
  talkingPoints: [
    "どんな問題が起きていたか",
    "なぜ見直しが必要だったか",
    "どのように変えたか",
  ],
  recommendedStructure: [
    "最初に結論を一言で述べる",
    "見直し前の問題を共有する",
    "変更点と理由を順番に話す",
  ],
  durationLabel: "60〜90秒" as const,
  createdAt: "2026-04-22T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

describe.each([{ name: "theme record parses", input: themeRecord }])(
  "ThemeRecordSchema",
  ({ input }) => {
    test.each([{ label: "theme schema parse succeeds" }])("$label", () => {
      expect(ThemeRecordSchema.parse(input)).toEqual(input);
    });
  },
);

describe.each([{ name: "request parses", input: themeRecord.userInput }])(
  "CreateThemeRequestSchema",
  ({ input }) => {
    test.each([{ label: "request schema parse succeeds" }])("$label", () => {
      expect(CreateThemeRequestSchema.parse(input)).toEqual(input);
    });
  },
);

describe.each([
  {
    name: "attempts over limit",
    input: {
      id: "session-1",
      theme: themeRecord,
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
  { name: "theme response parses", input: { theme: themeRecord } },
])("CreateThemeResponseSchema", ({ input }) => {
  test.each([{ label: "response schema parse succeeds" }])("$label", () => {
    expect(CreateThemeResponseSchema.parse(input)).toEqual(input);
  });
});

describe.each([
  {
    name: "list themes parses",
    input: {
      themes: [
        themeRecord,
        {
          ...themeRecord,
          id: "theme-2",
          title: "障害報告を説明する",
        },
      ],
    },
  },
])("ListThemesResponseSchema", ({ input }) => {
  test.each([{ label: "list response schema parse succeeds" }])(
    "$label",
    () => {
      expect(ListThemesResponseSchema.parse(input)).toEqual(input);
    },
  );
});
