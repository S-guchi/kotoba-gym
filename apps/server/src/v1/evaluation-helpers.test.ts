import type {
  AttemptEvaluation,
  PreviousEvaluationPayload,
  ThemeRecord,
} from "@kotoba-gym/core";
import { scoreAxes } from "@kotoba-gym/core";
import { describe, expect, test } from "vitest";
import { ApiError } from "./api-error.js";
import {
  buildEvaluationPrompt,
  buildScoreDiff,
  inferApiError,
  normalizeModelEvaluationPayload,
  normalizeScores,
  withDeterministicComparison,
} from "./evaluation-helpers.js";

const orderedScores = scoreAxes.map((axis, index) => ({
  axis,
  score: Math.min(index + 1, 5),
  comment: `${axis} comment`,
}));

const reversedScores = [...orderedScores].reverse();

const baseEvaluation: AttemptEvaluation = {
  transcript: "結論から話します。",
  summary: "構造は見えています。",
  scores: reversedScores,
  goodPoints: ["結論がある", "短く話している"],
  improvementPoints: ["数字がない", "根拠が薄い"],
  exampleAnswer: "結論、背景、効果の順で説明します。",
  nextFocus: "具体例を追加してください。",
  comparison: null,
};

const evaluationWithoutGoodPoints: AttemptEvaluation = {
  ...baseEvaluation,
  transcript: "[無音]",
  summary: "音声が確認できませんでした。",
  goodPoints: [],
};

const previousEvaluation: PreviousEvaluationPayload = {
  transcript: "前回の発話",
  summary: "前回の総評",
  scores: orderedScores.map((score) => ({
    ...score,
    score: Math.max(score.score - 1, 1),
  })),
  goodPoints: ["結論を出せた", "短かった"],
  improvementPoints: ["具体性不足", "理由が弱い"],
  nextFocus: "数字を入れる",
};

const evaluationWithEmptyComparisonArrays: AttemptEvaluation = {
  ...baseEvaluation,
  comparison: {
    scoreDiff: buildScoreDiff(previousEvaluation.scores, reversedScores),
    improvedPoints: [],
    remainingPoints: [],
    comparisonSummary: "比較結果です。",
  },
};

const theme: ThemeRecord = {
  id: "theme-1",
  title: "API キャッシュ戦略を説明する",
  userInput: {
    theme: "API キャッシュ戦略を見直した理由",
    personaId: "persona-new-member",
    goal: "設計意図を誤解なく理解してほしい",
  },
  persona: {
    id: "persona-new-member",
    name: "新メンバー",
    description:
      "最近チームに加わったばかりで、プロジェクトの背景知識が少ない。",
    emoji: "🧑‍💻",
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
  durationLabel: "60〜90秒",
  createdAt: "2026-04-22T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

describe.each([
  {
    name: "reorder shuffled scores",
    input: reversedScores,
    expected: orderedScores,
  },
])("normalizeScores", ({ input, expected }) => {
  test.each([{ label: "score order follows scoreAxes" }])("$label", () => {
    expect(normalizeScores(input)).toEqual(expected);
  });
});

describe.each([
  {
    name: "empty comparison arrays remain empty",
    input: evaluationWithEmptyComparisonArrays,
    expected: {
      improvedPoints: [],
      remainingPoints: [],
    },
  },
  {
    name: "empty comparison arrays remain empty even without good points",
    input: {
      ...evaluationWithoutGoodPoints,
      comparison: {
        scoreDiff: buildScoreDiff(previousEvaluation.scores, reversedScores),
        improvedPoints: [],
        remainingPoints: [],
        comparisonSummary: "比較結果です。",
      },
    },
    expected: {
      improvedPoints: [],
      remainingPoints: [],
    },
  },
])("normalizeModelEvaluationPayload", ({ input, expected }) => {
  test.each([{ label: "model payload is normalized before schema parse" }])(
    "$label",
    () => {
      const normalized = normalizeModelEvaluationPayload(input);
      expect(normalized.comparison).toMatchObject(expected);
    },
  );
});

describe.each([
  {
    name: "missing axis throws invalid_model_output",
    input: orderedScores.slice(0, 4),
  },
])("normalizeScores errors", ({ input }) => {
  test.each([{ label: "missing score axis is rejected" }])("$label", () => {
    expect(() => normalizeScores(input)).toThrowError(ApiError);
  });
});

describe.each([
  {
    name: "build deterministic diff in axis order",
    expectedDiffs: scoreAxes.map((axis, index) => ({
      axis,
      before: Math.max(index, 1),
      after: Math.min(index + 1, 5),
      diff: Math.min(index + 1, 5) - Math.max(index, 1),
    })),
  },
])("buildScoreDiff", ({ expectedDiffs }) => {
  test.each([{ label: "score diff is normalized by axis" }])("$label", () => {
    expect(buildScoreDiff(previousEvaluation.scores, orderedScores)).toEqual(
      expectedDiffs,
    );
  });
});

describe.each([
  {
    name: "first practice forces null comparison",
    raw: baseEvaluation,
    previous: undefined,
    expectedComparison: null,
  },
  {
    name: "retry practice injects fallback comparison",
    raw: baseEvaluation,
    previous: previousEvaluation,
    expectedComparison: {
      scoreDiff: buildScoreDiff(previousEvaluation.scores, reversedScores),
      improvedPoints: baseEvaluation.goodPoints.slice(0, 2),
      remainingPoints: baseEvaluation.improvementPoints.slice(0, 2),
      comparisonSummary:
        "前回より改善した点と残課題を比較できました。スコア差分を見ながら次の練習に反映してください。",
    },
  },
  {
    name: "retry practice without good points injects default improved point",
    raw: evaluationWithoutGoodPoints,
    previous: previousEvaluation,
    expectedComparison: {
      scoreDiff: buildScoreDiff(previousEvaluation.scores, reversedScores),
      improvedPoints: [
        "今回は改善点を特定できる十分な発話がありませんでした。",
      ],
      remainingPoints: evaluationWithoutGoodPoints.improvementPoints.slice(
        0,
        2,
      ),
      comparisonSummary:
        "前回より改善した点と残課題を比較できました。スコア差分を見ながら次の練習に反映してください。",
    },
  },
])("withDeterministicComparison", ({ raw, previous, expectedComparison }) => {
  test.each([{ label: "comparison payload is normalized" }])("$label", () => {
    expect(
      withDeterministicComparison({
        raw,
        previousEvaluation: previous,
      }).comparison,
    ).toEqual(expectedComparison);
  });
});

describe.each([
  {
    name: "retryable upstream timeout",
    error: new Error("deadline exceeded"),
    expected: {
      status: 503,
      code: "upstream_retryable",
      retryable: true,
    },
  },
  {
    name: "generic runtime error",
    error: new Error("unexpected"),
    expected: {
      status: 500,
      code: "evaluation_failed",
      retryable: false,
    },
  },
])("inferApiError", ({ error, expected }) => {
  test.each([{ label: "error is mapped to api error" }])("$label", () => {
    const mapped = inferApiError(error);
    expect({
      status: mapped.status,
      code: mapped.code,
      retryable: mapped.retryable,
    }).toEqual(expected);
  });
});

describe.each([
  {
    name: "initial prompt mentions null comparison",
    input: {
      theme,
      locale: "ja-JP",
    },
    expectedSnippet:
      "今回がこのテーマの初回練習です。comparison は null を返してください。",
  },
  {
    name: "retry prompt includes previous summary",
    input: {
      theme,
      locale: "ja-JP",
      previousEvaluationSummary: "前回は冗長でした。",
      previousEvaluation,
    },
    expectedSnippet: "previousEvaluationSummary: 前回は冗長でした。",
  },
  {
    name: "prompt includes audience context",
    input: {
      theme,
      locale: "ja-JP",
    },
    expectedSnippet: "## 相手の前提",
  },
])("buildEvaluationPrompt", ({ input, expectedSnippet }) => {
  test.each([{ label: "prompt reflects session context" }])("$label", () => {
    expect(buildEvaluationPrompt(input)).toContain(expectedSnippet);
  });
});
