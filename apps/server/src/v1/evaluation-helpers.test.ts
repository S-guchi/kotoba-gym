import type {
  AttemptEvaluation,
  PreviousAttemptPayload,
} from "@kotoba-gym/core";
import { scoreAxes } from "@kotoba-gym/core";
import { describe, expect, test } from "vitest";
import { ApiError } from "./api-error.js";
import {
  buildEvaluationPrompt,
  buildScoreDiff,
  inferApiError,
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

const previousEvaluation: PreviousAttemptPayload = {
  attemptNumber: 1,
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
    name: "first attempt forces null comparison",
    raw: baseEvaluation,
    previous: undefined,
    expectedComparison: null,
  },
  {
    name: "second attempt injects fallback comparison",
    raw: baseEvaluation,
    previous: previousEvaluation,
    expectedComparison: {
      scoreDiff: buildScoreDiff(previousEvaluation.scores, reversedScores),
      improvedPoints: baseEvaluation.goodPoints.slice(0, 2),
      remainingPoints: baseEvaluation.improvementPoints.slice(0, 2),
      comparisonSummary:
        "前回より改善した点と残課題を比較できました。スコア差分を見ながら次の回答に反映してください。",
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
      promptId: "tech-api-cache",
      attemptNumber: 1,
      locale: "ja-JP",
    },
    expectedSnippet: "comparison は null を返してください。",
  },
  {
    name: "retry prompt includes previous attempt summary",
    input: {
      promptId: "tech-api-cache",
      attemptNumber: 2,
      locale: "ja-JP",
      previousAttemptSummary: "前回は冗長でした。",
      previousEvaluation,
    },
    expectedSnippet: "previousAttemptSummary: 前回は冗長でした。",
  },
])("buildEvaluationPrompt", ({ input, expectedSnippet }) => {
  test.each([{ label: "prompt reflects attempt context" }])("$label", () => {
    expect(buildEvaluationPrompt(input)).toContain(expectedSnippet);
  });
});
