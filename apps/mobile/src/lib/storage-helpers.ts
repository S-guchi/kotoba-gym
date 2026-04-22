import {
  PreviousAttemptPayloadSchema,
  PracticeSessionRecordSchema,
  type AttemptEvaluation,
  type PracticePrompt,
  type PracticeSessionRecord,
  type PreviousAttemptPayload,
} from "@kotoba-gym/core";

export function createSessionId(now = Date.now(), randomValue = Math.random()) {
  return `session-${now}-${Math.round(randomValue * 1_000_000)}`;
}

export function createPracticeSessionRecord(params: {
  id: string;
  prompt: PracticePrompt;
  now: string;
}): PracticeSessionRecord {
  return {
    id: params.id,
    prompt: params.prompt,
    attempts: [],
    createdAt: params.now,
    updatedAt: params.now,
  };
}

export function upsertPracticeSessionAttempt(params: {
  record: PracticeSessionRecord;
  attemptNumber: number;
  evaluation: AttemptEvaluation;
  recordedAt: string;
  updatedAt: string;
}): PracticeSessionRecord {
  return {
    ...params.record,
    attempts: [
      ...params.record.attempts.filter(
        (attempt) => attempt.attemptNumber !== params.attemptNumber,
      ),
      {
        attemptNumber: params.attemptNumber,
        recordedAt: params.recordedAt,
        evaluation: params.evaluation,
      },
    ].sort((left, right) => left.attemptNumber - right.attemptNumber),
    updatedAt: params.updatedAt,
  };
}

export function sortPracticeSessions(sessions: PracticeSessionRecord[]) {
  return [...sessions].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function parseStoredPracticeSession(
  input: unknown,
): PracticeSessionRecord | null {
  const parsed = PracticeSessionRecordSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export function toPreviousAttemptPayload(
  attemptNumber: number,
  evaluation: AttemptEvaluation,
): PreviousAttemptPayload {
  return PreviousAttemptPayloadSchema.parse({
    attemptNumber,
    transcript: evaluation.transcript,
    summary: evaluation.summary,
    scores: evaluation.scores,
    goodPoints: evaluation.goodPoints,
    improvementPoints: evaluation.improvementPoints,
    nextFocus: evaluation.nextFocus,
  });
}
