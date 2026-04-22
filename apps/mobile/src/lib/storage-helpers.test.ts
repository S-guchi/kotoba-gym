import { describe, expect, test } from "vitest";
import { scoreAxes } from "@kotoba-gym/core";
import type {
  AttemptEvaluation,
  PersonalizedPracticePrompt,
} from "@kotoba-gym/core";
import {
  createPracticeSessionRecord,
  createSessionId,
  sortPracticeSessions,
  toPreviousAttemptPayload,
  upsertPracticeSessionAttempt,
} from "./storage-helpers";

const prompt: PersonalizedPracticePrompt = {
  id: "personalized-1",
  category: "tech-explanation",
  title: "API キャッシュ戦略の説明",
  prompt:
    "新しく入ったメンバーに、なぜ API レスポンスのキャッシュ戦略を見直したのか説明してください。",
  situation:
    "相手はバックエンド経験が浅く、結論先出しで要点を知りたがっています。",
  goals: [
    "最初に結論を置く",
    "現状の問題と改善後の違いを分けて話す",
  ],
  durationLabel: "60〜90秒",
  personalized: true,
};
const evaluation: AttemptEvaluation = {
  transcript: "結論から説明します。",
  summary: "簡潔に話せています。",
  scores: scoreAxes.map((axis, index) => ({
    axis,
    score: Math.min(index + 1, 5),
    comment: `${axis} comment`,
  })),
  goodPoints: ["結論が早い", "簡潔"],
  improvementPoints: ["数字不足", "例が少ない"],
  exampleAnswer: "結論、背景、効果を順に話します。",
  nextFocus: "数字を一つ加える",
  comparison: null,
};

describe.each([
  {
    name: "session id is deterministic from inputs",
    now: 1_713_740_000_000,
    randomValue: 0.123456,
    expected: "session-1713740000000-123456",
  },
])("createSessionId", ({ now, randomValue, expected }) => {
  test.each([{ label: "session id format is stable" }])("$label", () => {
    expect(createSessionId(now, randomValue)).toBe(expected);
  });
});

describe.each([
  {
    name: "new session starts empty",
    input: {
      id: "session-1",
      prompt,
      now: "2026-04-22T00:00:00.000Z",
    },
    expected: {
      id: "session-1",
      prompt,
      attempts: [],
      createdAt: "2026-04-22T00:00:00.000Z",
      updatedAt: "2026-04-22T00:00:00.000Z",
    },
  },
])("createPracticeSessionRecord", ({ input, expected }) => {
  test.each([{ label: "record bootstrap matches schema" }])("$label", () => {
    expect(createPracticeSessionRecord(input)).toEqual(expected);
  });
});

describe.each([
  {
    name: "append first attempt",
    input: {
      record: createPracticeSessionRecord({
        id: "session-1",
        prompt,
        now: "2026-04-22T00:00:00.000Z",
      }),
      attemptNumber: 1,
      evaluation,
      recordedAt: "2026-04-22T00:01:00.000Z",
      updatedAt: "2026-04-22T00:01:00.000Z",
    },
    expectedAttemptNumbers: [1],
  },
  {
    name: "replace existing attempt and keep order",
    input: {
      record: {
        ...createPracticeSessionRecord({
          id: "session-1",
          prompt,
          now: "2026-04-22T00:00:00.000Z",
        }),
        attempts: [
          {
            attemptNumber: 2,
            recordedAt: "2026-04-22T00:03:00.000Z",
            evaluation,
          },
          {
            attemptNumber: 1,
            recordedAt: "2026-04-22T00:01:00.000Z",
            evaluation,
          },
        ],
      },
      attemptNumber: 2,
      evaluation: {
        ...evaluation,
        summary: "更新後の総評",
      },
      recordedAt: "2026-04-22T00:04:00.000Z",
      updatedAt: "2026-04-22T00:04:00.000Z",
    },
    expectedAttemptNumbers: [1, 2],
  },
])("upsertPracticeSessionAttempt", ({ input, expectedAttemptNumbers }) => {
  test.each([{ label: "attempts are upserted and sorted" }])("$label", () => {
    const updated = upsertPracticeSessionAttempt(input);
    expect(updated.attempts.map((attempt) => attempt.attemptNumber)).toEqual(
      expectedAttemptNumbers,
    );
    expect(updated.updatedAt).toBe(input.updatedAt);
  });
});

describe.each([
  {
    name: "sessions are sorted by updatedAt desc",
    sessions: [
      {
        ...createPracticeSessionRecord({
          id: "session-older",
          prompt,
          now: "2026-04-22T00:00:00.000Z",
        }),
        updatedAt: "2026-04-22T00:01:00.000Z",
      },
      {
        ...createPracticeSessionRecord({
          id: "session-newer",
          prompt,
          now: "2026-04-22T00:00:00.000Z",
        }),
        updatedAt: "2026-04-22T00:02:00.000Z",
      },
    ],
    expected: ["session-newer", "session-older"],
  },
])("sortPracticeSessions", ({ sessions, expected }) => {
  test.each([{ label: "sessions list is sorted descending" }])("$label", () => {
    expect(sortPracticeSessions(sessions).map((session) => session.id)).toEqual(
      expected,
    );
  });
});

describe.each([
  {
    name: "previous attempt payload omits comparison",
    attemptNumber: 1,
    evaluation,
    expected: {
      attemptNumber: 1,
      transcript: evaluation.transcript,
      summary: evaluation.summary,
      scores: evaluation.scores,
      goodPoints: evaluation.goodPoints,
      improvementPoints: evaluation.improvementPoints,
      nextFocus: evaluation.nextFocus,
    },
  },
])("toPreviousAttemptPayload", ({ attemptNumber, evaluation, expected }) => {
  test.each([{ label: "payload keeps only retry-safe fields" }])(
    "$label",
    () => {
      expect(toPreviousAttemptPayload(attemptNumber, evaluation)).toEqual(
        expected,
      );
    },
  );
});
