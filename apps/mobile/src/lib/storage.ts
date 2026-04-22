import type {
  PersonalizedPracticePrompt,
  PracticeSessionRecord,
} from "@kotoba-gym/core";
import {
  createRemotePracticeSession,
  fetchPracticeSession,
  fetchPracticeSessions,
} from "./api";

const sessionCache = new Map<string, PracticeSessionRecord>();

export async function createPracticeSession(
  prompt: PersonalizedPracticePrompt,
): Promise<PracticeSessionRecord> {
  const session = await createRemotePracticeSession(prompt.id);
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

  sessionCache.set(session.id, session);
  return session;
}

export async function listPracticeSessions() {
  const sessions = await fetchPracticeSessions();
  for (const session of sessions) {
    sessionCache.set(session.id, session);
  }
  return sessions;
}

export function cachePracticeSession(session: PracticeSessionRecord) {
  sessionCache.set(session.id, session);
  return session;
}
