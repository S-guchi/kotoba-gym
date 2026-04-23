import { describe, expect, test } from "vitest";
import type { AttemptEvaluation, ThemeRecord } from "@kotoba-gym/core";
import {
  createPracticeSessionRecord,
  sortPracticeSessions,
  toPreviousAttemptPayload,
  upsertPracticeSessionAttempt,
} from "./storage-helpers";

const theme: ThemeRecord = {
  id: "theme-1",
  title: "障害報告を説明する",
  userInput: {
    theme: "障害報告",
    audience: "上司",
    goal: "判断してほしい",
  },
  mission: "上司に、いま判断が必要な障害状況だと伝わるように説明してください。",
  audienceSummary: "相手は現状と次のアクションを短く知りたがっています。",
  talkingPoints: [
    "何が起きているか",
    "影響範囲はどこか",
    "次に何を判断してほしいか",
  ],
  recommendedStructure: [
    "最初に障害の要点を述べる",
    "影響範囲を続ける",
    "必要な判断を最後に伝える",
  ],
  durationLabel: "30〜45秒",
  createdAt: "2026-04-22T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

const evaluation: AttemptEvaluation = {
  transcript: "現在障害が起きています。",
  summary: "要点は伝えられています。",
  scores: [
    { axis: "conclusion", score: 3, comment: "a" },
    { axis: "structure", score: 4, comment: "b" },
    { axis: "specificity", score: 3, comment: "c" },
    { axis: "technicalValidity", score: 4, comment: "d" },
    { axis: "brevity", score: 3, comment: "e" },
  ],
  goodPoints: ["要点が先にある"],
  improvementPoints: ["数字が足りない"],
  exampleAnswer: "障害の要点から説明します。",
  nextFocus: "影響範囲を数字で示す",
  comparison: null,
};

describe.each([
  {
    name: "create session record seeds empty attempts",
    input: {
      id: "session-1",
      theme,
      now: "2026-04-22T00:00:00.000Z",
    },
    expected: {
      id: "session-1",
      theme,
      attempts: [],
      createdAt: "2026-04-22T00:00:00.000Z",
      updatedAt: "2026-04-22T00:00:00.000Z",
    },
  },
])("createPracticeSessionRecord", ({ input, expected }) => {
  test.each([{ label: "session seed is deterministic" }])("$label", () => {
    expect(createPracticeSessionRecord(input)).toEqual(expected);
  });
});

describe.each([
  {
    name: "upsert inserts new attempt",
    input: {
      record: createPracticeSessionRecord({
        id: "session-1",
        theme,
        now: "2026-04-22T00:00:00.000Z",
      }),
      attemptNumber: 1,
      evaluation,
      recordedAt: "2026-04-22T00:01:00.000Z",
      updatedAt: "2026-04-22T00:01:00.000Z",
    },
    expectedAttempts: [1],
  },
])("upsertPracticeSessionAttempt", ({ input, expectedAttempts }) => {
  test.each([{ label: "attempt upsert keeps sorted order" }])("$label", () => {
    expect(
      upsertPracticeSessionAttempt(input).attempts.map(
        (attempt) => attempt.attemptNumber,
      ),
    ).toEqual(expectedAttempts);
  });
});

describe.each([
  {
    name: "sort latest updatedAt first",
    input: [
      {
        ...createPracticeSessionRecord({
          id: "session-1",
          theme,
          now: "2026-04-22T00:00:00.000Z",
        }),
        updatedAt: "2026-04-22T00:00:00.000Z",
      },
      {
        ...createPracticeSessionRecord({
          id: "session-2",
          theme,
          now: "2026-04-22T00:00:00.000Z",
        }),
        updatedAt: "2026-04-22T00:02:00.000Z",
      },
    ],
    expectedIds: ["session-2", "session-1"],
  },
])("sortPracticeSessions", ({ input, expectedIds }) => {
  test.each([{ label: "session sort is deterministic" }])("$label", () => {
    expect(sortPracticeSessions(input).map((session) => session.id)).toEqual(
      expectedIds,
    );
  });
});

describe.each([
  {
    name: "previous payload keeps only comparison-safe fields",
    input: {
      attemptNumber: 1,
      evaluation,
    },
    expected: {
      attemptNumber: 1,
      transcript: "現在障害が起きています。",
      summary: "要点は伝えられています。",
      scores: evaluation.scores,
      goodPoints: ["要点が先にある"],
      improvementPoints: ["数字が足りない"],
      nextFocus: "影響範囲を数字で示す",
    },
  },
])("toPreviousAttemptPayload", ({ input, expected }) => {
  test.each([{ label: "comparison payload is derived deterministically" }])(
    "$label",
    () => {
      expect(
        toPreviousAttemptPayload(input.attemptNumber, input.evaluation),
      ).toEqual(expected);
    },
  );
});
