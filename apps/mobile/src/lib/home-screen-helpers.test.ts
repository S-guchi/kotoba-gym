import { describe, expect, test } from "vitest";
import type { PracticeSessionRecord, ThemeRecord } from "@kotoba-gym/core";
import { buildHomeFeed } from "./home-screen-helpers";

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

const session: PracticeSessionRecord = {
  id: "session-1",
  theme,
  evaluation: null,
  recordedAt: null,
  createdAt: "2026-04-22T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

describe.each([
  {
    name: "themes and sessions drive home feed",
    input: {
      themes: [theme, { ...theme, id: "theme-2", title: "別テーマ" }],
      sessions: [session],
    },
    expected: {
      featuredThemeId: "theme-1",
      recentThemeIds: ["theme-2"],
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
        shouldShowEmptyState: resolved.shouldShowEmptyState,
        recentSessionCount: resolved.recentSessionCount,
      }).toEqual(expected);
    },
  );
});
