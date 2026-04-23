import type {
  CreateThemeRequest,
  PracticeSessionRecord,
  ThemeRecord,
} from "@kotoba-gym/core";
import {
  createRemotePracticeSession,
  createRemoteTheme,
  fetchPracticeSession,
  fetchPracticeSessions,
  fetchTheme,
  fetchThemes,
} from "./api";

const themeCache = new Map<string, ThemeRecord>();
const sessionCache = new Map<string, PracticeSessionRecord>();

export async function createTheme(input: CreateThemeRequest) {
  const theme = await createRemoteTheme(input);
  themeCache.set(theme.id, theme);
  return theme;
}

export async function getTheme(themeId: string) {
  const cached = themeCache.get(themeId);
  if (cached) {
    return cached;
  }

  const theme = await fetchTheme(themeId);
  if (!theme) {
    return null;
  }

  themeCache.set(theme.id, theme);
  return theme;
}

export async function listThemes() {
  const themes = await fetchThemes();
  for (const theme of themes) {
    themeCache.set(theme.id, theme);
  }
  return themes;
}

export async function createPracticeSession(
  theme: ThemeRecord,
): Promise<PracticeSessionRecord> {
  const session = await createRemotePracticeSession(theme.id);
  themeCache.set(theme.id, theme);
  sessionCache.set(session.id, session);
  return session;
}

export async function getPracticeSession(sessionId: string) {
  const cached = sessionCache.get(sessionId);
  if (cached) {
    return cached;
  }

  const session = await fetchPracticeSession(sessionId);
  if (!session) {
    return null;
  }

  themeCache.set(session.theme.id, session.theme);
  sessionCache.set(session.id, session);
  return session;
}

export async function listPracticeSessions() {
  const sessions = await fetchPracticeSessions();
  for (const session of sessions) {
    themeCache.set(session.theme.id, session.theme);
    sessionCache.set(session.id, session);
  }
  return sessions;
}

export function cachePracticeSession(session: PracticeSessionRecord) {
  themeCache.set(session.theme.id, session.theme);
  sessionCache.set(session.id, session);
  return session;
}
