import { describe, expect, test } from "vitest";
import type { PracticeSessionRecord, ThemeRecord } from "@kotoba-gym/core";
import {
  buildHomeFeed,
  buildResumeProgress,
  getResumeSession,
} from "./home-screen-helpers";

const theme: ThemeRecord = {
  id: "theme-1",
  title: "Expo の強みを説明する",
  userInput: {
    theme: "Expo の強み",
    audience: "面接官",
    goal: "強みを評価してほしい",
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

const resumeSession: PracticeSessionRecord = {
  id: "session-1",
  theme,
  attempts: [
    {
      attemptNumber: 1,
      recordedAt: "2026-04-22T00:00:00.000Z",
      evaluation: {
        transcript: "回答です。",
        summary: "総評です。",
        scores: [
          { axis: "conclusion", score: 3, comment: "a" },
          { axis: "structure", score: 3, comment: "b" },
          { axis: "specificity", score: 3, comment: "c" },
          { axis: "technicalValidity", score: 3, comment: "d" },
          { axis: "brevity", score: 3, comment: "e" },
        ],
        goodPoints: ["結論がある"],
        improvementPoints: ["例が少ない"],
        exampleAnswer: "改善例です。",
        nextFocus: "具体例を追加する",
        comparison: null,
      },
    },
  ],
  createdAt: "2026-04-22T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

describe.each([
  {
    name: "finds first resumable session",
    sessions: [resumeSession],
    expected: resumeSession.id,
  },
  {
    name: "returns null when no resumable session exists",
    sessions: [
      {
        ...resumeSession,
        attempts: [
          ...resumeSession.attempts,
          { ...resumeSession.attempts[0], attemptNumber: 2 },
        ],
      },
    ],
    expected: null,
  },
])("getResumeSession", ({ sessions, expected }) => {
  test.each([{ label: "resume session selection is stable" }])("$label", () => {
    expect(getResumeSession(sessions)?.id ?? null).toBe(expected);
  });
});

describe.each([
  {
    name: "resume progress uses existing attempt count",
    session: resumeSession,
    expected: {
      completedAttempts: 1,
      totalAttempts: 2,
      ratio: 0.5,
      label: "1/2 回答済み",
      focusText: "具体例を追加する",
    },
  },
])("buildResumeProgress", ({ session, expected }) => {
  test.each([{ label: "resume progress is deterministic" }])("$label", () => {
    expect(buildResumeProgress(session)).toEqual(expected);
  });
});

describe.each([
  {
    name: "themes and sessions drive home feed",
    input: {
      themes: [theme, { ...theme, id: "theme-2", title: "別テーマ" }],
      sessions: [resumeSession],
    },
    expected: {
      featuredThemeId: "theme-1",
      recentThemeIds: ["theme-2"],
      resumeSessionId: "session-1",
      shouldShowEmptyState: false,
      recentSessionCount: 1,
    },
  },
  {
    name: "empty state is derived from both lists",
    input: {
      themes: [],
      sessions: [],
    },
    expected: {
      featuredThemeId: null,
      recentThemeIds: [],
      resumeSessionId: null,
      shouldShowEmptyState: true,
      recentSessionCount: 0,
    },
  },
])("buildHomeFeed", ({ input, expected }) => {
  test.each([{ label: "home feed sections are resolved deterministically" }])(
    "$label",
    () => {
      const resolved = buildHomeFeed(input);
      expect({
        featuredThemeId: resolved.featuredTheme?.id ?? null,
        recentThemeIds: resolved.recentThemes.map((item) => item.id),
        resumeSessionId: resolved.resumeSession?.id ?? null,
        shouldShowEmptyState: resolved.shouldShowEmptyState,
        recentSessionCount: resolved.recentSessionCount,
      }).toEqual(expected);
    },
  );
});
