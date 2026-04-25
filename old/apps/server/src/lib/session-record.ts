import type {
  AttemptEvaluation,
  PracticeSessionRecord,
  PreviousEvaluationPayload,
  ThemeRecord,
} from "@kotoba-gym/core";
import { PreviousEvaluationPayloadSchema } from "@kotoba-gym/core";

export function createSessionId(now = Date.now(), randomValue = Math.random()) {
  return `session-${now}-${Math.round(randomValue * 1_000_000)}`;
}

export function createPracticeSessionRecord(params: {
  id: string;
  theme: ThemeRecord;
  now: string;
}): PracticeSessionRecord {
  return {
    id: params.id,
    theme: params.theme,
    evaluation: null,
    recordedAt: null,
    createdAt: params.now,
    updatedAt: params.now,
  };
}

export function sortPracticeSessions(sessions: PracticeSessionRecord[]) {
  return [...sessions].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function setSessionEvaluation(params: {
  record: PracticeSessionRecord;
  evaluation: AttemptEvaluation;
  recordedAt: string;
  updatedAt: string;
}): PracticeSessionRecord {
  return {
    ...params.record,
    evaluation: params.evaluation,
    recordedAt: params.recordedAt,
    updatedAt: params.updatedAt,
  };
}

export function toPreviousEvaluationPayload(
  evaluation: AttemptEvaluation,
): PreviousEvaluationPayload {
  return PreviousEvaluationPayloadSchema.parse({
    transcript: evaluation.transcript,
    summary: evaluation.summary,
    scores: evaluation.scores,
    goodPoints: evaluation.goodPoints,
    improvementPoints: evaluation.improvementPoints,
    nextFocus: evaluation.nextFocus,
  });
}
