import type {
  AttemptEvaluation,
  PracticePrompt,
  PracticeSessionRecord,
} from "@kotoba-gym/core";
import {
  createRemotePracticeSession,
  fetchPracticeSession,
  fetchPracticeSessions,
} from "./api";

const sessionCache = new Map<string, PracticeSessionRecord>();

export async function createPracticeSession(
  prompt: PracticePrompt,
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

export async function appendAttemptToSession(params: {
  sessionId: string;
  attemptNumber: number;
  evaluation: AttemptEvaluation;
}) {
  const cached = sessionCache.get(params.sessionId);
  if (cached) {
    sessionCache.set(params.sessionId, {
      ...cached,
      attempts: [
        ...cached.attempts.filter(
          (attempt) => attempt.attemptNumber !== params.attemptNumber,
        ),
        {
          attemptNumber: params.attemptNumber,
          recordedAt: new Date().toISOString(),
          evaluation: params.evaluation,
        },
      ].sort((left, right) => left.attemptNumber - right.attemptNumber),
    });
  }

  return getPracticeSession(params.sessionId);
}

export function cachePracticeSession(session: PracticeSessionRecord) {
  sessionCache.set(session.id, session);
  return session;
}

export { toPreviousAttemptPayload } from "./storage-helpers";
