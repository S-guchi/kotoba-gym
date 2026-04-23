import type { PracticeSessionRecord, ThemeRecord } from "@kotoba-gym/core";

export function getResumeSession(sessions: PracticeSessionRecord[]) {
  return sessions.find((session) => session.attempts.length === 1) ?? null;
}

export function buildResumeProgress(session: PracticeSessionRecord) {
  const completedAttempts = Math.min(session.attempts.length, 2);

  return {
    completedAttempts,
    totalAttempts: 2,
    ratio: completedAttempts / 2,
    label: `${completedAttempts}/2 回答済み`,
    focusText:
      session.attempts[0]?.evaluation.nextFocus ?? "次の回答に進みましょう",
  };
}

export function buildHomeFeed(params: {
  themes: ThemeRecord[];
  sessions: PracticeSessionRecord[];
}) {
  return {
    featuredTheme: params.themes[0] ?? null,
    recentThemes: params.themes.slice(1, 5),
    resumeSession: getResumeSession(params.sessions),
    shouldShowEmptyState:
      params.themes.length === 0 && params.sessions.length === 0,
    recentSessionCount: params.sessions.length,
  };
}
