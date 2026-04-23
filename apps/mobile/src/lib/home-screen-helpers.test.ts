import { describe, expect, test } from "vitest";
import type { PracticeSessionRecord, ThemeRecord } from "@kotoba-gym/core";
import { buildHomeFeed } from "./home-screen-helpers";

const theme: ThemeRecord = {
  id: "theme-1",
  title: "Expo の強みを説明する",
  userInput: {
    theme: "Expo の強み",
    personaId: "persona-interviewer",
    goal: "強みを評価してほしい",
  },
  persona: {
    id: "persona-interviewer",
    name: "面接官",
    description: "技術的な深さと論理的な説明力を重視する採用担当。",
    emoji: "👔",
  },
  mission: "面接官に、Expo を選ぶ判断軸と強みが伝わるように説明してください。",
  audienceSummary: "相手は実例と判断理由を重視しています。",
  talkingPoints: [
    "どんな課題に合っていたか",
    "なぜ Expo が有効だったか",
    "開発や運用でどう効いたか",
  ],
  recommendedStructure: [
    "最初に強みを一言で述べる",
    "課題との対応を話す",
    "実例で締める",
  ],
  durationLabel: "45〜60秒",
  createdAt: "2026-04-22T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

const session: PracticeSessionRecord = {
  id: "session-1",
  theme,
  evaluation: null,
  recordedAt: null,
  createdAt: "2026-04-22T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

const evaluatedSession: PracticeSessionRecord = {
  ...session,
  evaluation: {
    transcript: "Expo を使う理由を説明しました。",
    summary: "Expo の判断理由を説明できている。",
    scores: [
      { axis: "conclusion", score: 3, comment: "a" },
      { axis: "structure", score: 3, comment: "b" },
      { axis: "specificity", score: 3, comment: "c" },
      { axis: "technicalValidity", score: 3, comment: "d" },
      { axis: "brevity", score: 3, comment: "e" },
    ],
    goodPoints: ["結論が明確"],
    improvementPoints: ["具体例を増やす"],
    exampleAnswer: "Expo は...",
    nextFocus: "具体例",
    comparison: null,
  },
  recordedAt: "2026-04-22T10:00:00.000Z",
  updatedAt: "2026-04-22T10:00:00.000Z",
};

describe.each([
  {
    name: "themes and sessions drive home feed",
    input: {
      themes: [theme, { ...theme, id: "theme-2", title: "別テーマ" }],
      sessions: [session],
      now: new Date("2026-04-23T21:00:00.000+09:00"),
    },
    expected: {
      todaysRunThemeId: "theme-1",
      themeRowIds: ["theme-1", "theme-2"],
      shouldShowEmptyState: false,
      sessionCount: 1,
    },
  },
  {
    name: "empty state is derived from both lists",
    input: {
      themes: [],
      sessions: [],
      now: new Date("2026-04-23T21:00:00.000+09:00"),
    },
    expected: {
      todaysRunThemeId: null,
      themeRowIds: [],
      shouldShowEmptyState: true,
      sessionCount: 0,
    },
  },
])("buildHomeFeed", ({ input, expected }) => {
  test.each([{ label: "home feed sections are resolved deterministically" }])(
    "$label",
    () => {
      const resolved = buildHomeFeed(input);
      expect({
        todaysRunThemeId: resolved.todaysRun?.theme.id ?? null,
        themeRowIds: resolved.themeRows.map((item) => item.theme.id),
        shouldShowEmptyState: resolved.shouldShowEmptyState,
        sessionCount: resolved.sessionCount,
      }).toEqual(expected);
    },
  );
});

describe.each([
  {
    name: "current streak keeps yesterday anchor before today's practice",
    now: new Date("2026-04-23T21:00:00.000+09:00"),
    sessions: [
      {
        ...evaluatedSession,
        id: "session-1",
        recordedAt: "2026-04-20T10:00:00.000Z",
      },
      {
        ...evaluatedSession,
        id: "session-2",
        recordedAt: "2026-04-21T10:00:00.000Z",
      },
      {
        ...evaluatedSession,
        id: "session-3",
        recordedAt: "2026-04-22T10:00:00.000Z",
      },
    ],
    expected: {
      streakDays: 3,
      weeklySessionCount: 3,
      weekOverWeekDiff: 3,
      practicedWeekdays: [true, true, true, false, false, false, false],
    },
  },
  {
    name: "current streak starts from today when practiced today",
    now: new Date("2026-04-23T21:00:00.000+09:00"),
    sessions: [
      {
        ...evaluatedSession,
        id: "session-1",
        recordedAt: "2026-04-22T10:00:00.000Z",
      },
      {
        ...evaluatedSession,
        id: "session-2",
        recordedAt: "2026-04-23T10:00:00.000Z",
      },
      {
        ...evaluatedSession,
        id: "session-3",
        recordedAt: "2026-04-15T10:00:00.000Z",
      },
    ],
    expected: {
      streakDays: 2,
      weeklySessionCount: 2,
      weekOverWeekDiff: 1,
      practicedWeekdays: [false, false, true, true, false, false, false],
    },
  },
])("buildHomeFeed stats", ({ now, sessions, expected }) => {
  test.each([{ label: "practice stats are derived from evaluated sessions" }])(
    "$label",
    () => {
      const resolved = buildHomeFeed({ themes: [theme], sessions, now });
      expect(resolved.stats).toMatchObject(expected);
    },
  );
});

describe.each([
  {
    name: "recent evaluated theme is the run target",
    themes: [theme, { ...theme, id: "theme-2", title: "別テーマ" }],
    sessions: [
      {
        ...evaluatedSession,
        id: "session-1",
        recordedAt: "2026-04-21T10:00:00.000Z",
      },
      {
        ...evaluatedSession,
        id: "session-2",
        theme: { ...theme, id: "theme-2", title: "別テーマ" },
        recordedAt: "2026-04-22T10:00:00.000Z",
      },
    ],
    expected: {
      themeId: "theme-2",
      previousScore: 60,
      targetScore: 62,
    },
  },
  {
    name: "latest theme is the run target without evaluated sessions",
    themes: [theme],
    sessions: [session],
    expected: {
      themeId: "theme-1",
      previousScore: null,
      targetScore: null,
    },
  },
])("buildHomeFeed today's run", ({ themes, sessions, expected }) => {
  test.each([{ label: "run target follows the priority rule" }])(
    "$label",
    () => {
      const resolved = buildHomeFeed({
        themes,
        sessions,
        now: new Date("2026-04-23T21:00:00.000+09:00"),
      });

      expect({
        themeId: resolved.todaysRun?.theme.id ?? null,
        previousScore: resolved.todaysRun?.previousScore ?? null,
        targetScore: resolved.todaysRun?.targetScore ?? null,
      }).toEqual(expected);
    },
  );
});
