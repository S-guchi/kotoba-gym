import type { PracticeSessionRecord, ThemeRecord } from "@kotoba-gym/core";

export function buildHomeFeed(params: {
  themes: ThemeRecord[];
  sessions: PracticeSessionRecord[];
}) {
  return {
    featuredTheme: params.themes[0] ?? null,
    recentThemes: params.themes.slice(1, 5),
    shouldShowEmptyState:
      params.themes.length === 0 && params.sessions.length === 0,
    recentSessionCount: params.sessions.length,
  };
}
