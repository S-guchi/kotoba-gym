import { Directory, File, Paths } from "expo-file-system";
import type {
  AttemptEvaluation,
  PracticePrompt,
  PracticeSessionRecord,
  PreviousAttemptPayload,
} from "../shared/practice";
import {
  PracticeSessionRecordSchema,
  PreviousAttemptPayloadSchema,
} from "../shared/practice";

const sessionCache = new Map<string, PracticeSessionRecord>();

function rootDirectory() {
  const dir = new Directory(Paths.document, "kotoba-gym");
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

function sessionDirectory() {
  const dir = new Directory(rootDirectory(), "sessions");
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

function sessionFile(sessionId: string) {
  return new File(sessionDirectory(), `${sessionId}.json`);
}

function createSessionId() {
  return `session-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

async function persistSession(record: PracticeSessionRecord) {
  const file = sessionFile(record.id);
  await file.write(JSON.stringify(record, null, 2));
  sessionCache.set(record.id, record);
}

export async function createPracticeSession(
  prompt: PracticePrompt,
): Promise<PracticeSessionRecord> {
  const now = new Date().toISOString();
  const record: PracticeSessionRecord = {
    id: createSessionId(),
    prompt,
    attempts: [],
    createdAt: now,
    updatedAt: now,
  };

  await persistSession(record);
  return record;
}

export async function getPracticeSession(sessionId: string) {
  const cached = sessionCache.get(sessionId);
  if (cached) {
    return cached;
  }

  const file = sessionFile(sessionId);
  if (!file.exists) {
    return null;
  }

  const parsed = PracticeSessionRecordSchema.parse(
    JSON.parse(await file.text()),
  );
  sessionCache.set(parsed.id, parsed);
  return parsed;
}

export async function listPracticeSessions() {
  const entries = sessionDirectory().list();
  const files = entries.filter((entry): entry is File => entry instanceof File);
  const sessions = await Promise.all(
    files
      .filter((file) => file.name.endsWith(".json"))
      .map(async (file) =>
        PracticeSessionRecordSchema.parse(JSON.parse(await file.text())),
      ),
  );

  sessions.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
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
  const record = await getPracticeSession(params.sessionId);
  if (!record) {
    throw new Error("session not found");
  }

  const updated: PracticeSessionRecord = {
    ...record,
    attempts: [
      ...record.attempts.filter(
        (attempt) => attempt.attemptNumber !== params.attemptNumber,
      ),
      {
        attemptNumber: params.attemptNumber,
        recordedAt: new Date().toISOString(),
        evaluation: params.evaluation,
      },
    ].sort((left, right) => left.attemptNumber - right.attemptNumber),
    updatedAt: new Date().toISOString(),
  };

  await persistSession(updated);
  return updated;
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

