import type {
  CreateSessionRequest,
  SessionRecord,
  UpdateSessionRequest,
} from "@kotoba-gym/core";
import { File, Paths } from "expo-file-system";
import {
  applyLocalSessionUpdate,
  createLocalSessionRecord,
  listOwnerSessions,
  parseStoredSessions,
} from "./session-store-core";

const sessionsFile = new File(Paths.document, "kotoba-gym-sessions.json");

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `session-${crypto.randomUUID()}`;
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function readSessions(): Promise<SessionRecord[]> {
  if (!sessionsFile.exists) {
    return [];
  }

  try {
    return parseStoredSessions(await sessionsFile.text());
  } catch {
    return [];
  }
}

function writeSessions(sessions: SessionRecord[]) {
  sessionsFile.create({ overwrite: true });
  sessionsFile.write(JSON.stringify(sessions));
}

export async function createSession(input: CreateSessionRequest) {
  const sessions = await readSessions();
  const session = createLocalSessionRecord({
    id: createSessionId(),
    input,
    now: new Date().toISOString(),
  });
  writeSessions([session, ...sessions]);
  return session;
}

export async function updateSession(
  sessionId: string,
  input: UpdateSessionRequest,
) {
  const sessions = await readSessions();
  const current = sessions.find(
    (session) =>
      session.id === sessionId && session.ownerKey === input.ownerKey,
  );
  if (!current) {
    return null;
  }

  const next = applyLocalSessionUpdate({
    current,
    input,
    now: new Date().toISOString(),
  });
  writeSessions(
    sessions.map((session) => (session.id === sessionId ? next : session)),
  );
  return next;
}

export async function fetchSession(sessionId: string, ownerKey: string) {
  const sessions = await readSessions();
  return (
    sessions.find(
      (session) => session.id === sessionId && session.ownerKey === ownerKey,
    ) ?? null
  );
}

export async function fetchSessions(ownerKey: string) {
  return listOwnerSessions({
    sessions: await readSessions(),
    ownerKey,
  });
}
