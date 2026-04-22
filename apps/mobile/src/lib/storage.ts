import { Directory, File, Paths } from "expo-file-system";
import {
  PracticeSessionRecordSchema,
  AttemptEvaluation,
  PracticePrompt,
  PracticeSessionRecord,
} from "@kotoba-gym/core";
import {
  createPracticeSessionRecord,
  createSessionId,
  sortPracticeSessions,
  upsertPracticeSessionAttempt,
} from "./storage-helpers";

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

async function persistSession(record: PracticeSessionRecord) {
  const file = sessionFile(record.id);
  await file.write(JSON.stringify(record, null, 2));
  sessionCache.set(record.id, record);
}

export async function createPracticeSession(
  prompt: PracticePrompt,
): Promise<PracticeSessionRecord> {
  const now = new Date().toISOString();
  const record = createPracticeSessionRecord({
    id: createSessionId(),
    prompt,
    now,
  });

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

  const sortedSessions = sortPracticeSessions(sessions);
  for (const session of sortedSessions) {
    sessionCache.set(session.id, session);
  }
  return sortedSessions;
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

  const now = new Date().toISOString();
  const updated = upsertPracticeSessionAttempt({
    record,
    attemptNumber: params.attemptNumber,
    evaluation: params.evaluation,
    recordedAt: now,
    updatedAt: now,
  });

  await persistSession(updated);
  return updated;
}

export { toPreviousAttemptPayload } from "./storage-helpers";
