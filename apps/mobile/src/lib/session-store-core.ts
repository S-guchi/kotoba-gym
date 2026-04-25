import type {
  CreateSessionRequest,
  SessionRecord,
  UpdateSessionRequest,
} from "@kotoba-gym/core";
import { SessionRecordSchema } from "@kotoba-gym/core";
import { z } from "zod";

const SessionRecordsSchema = z.array(SessionRecordSchema);

export function parseStoredSessions(value: string) {
  return SessionRecordsSchema.parse(JSON.parse(value));
}

export function createLocalSessionRecord({
  id,
  input,
  now,
}: {
  id: string;
  input: CreateSessionRequest;
  now: string;
}): SessionRecord {
  return {
    id,
    ownerKey: input.ownerKey,
    title: input.title?.trim() || "新しい整理",
    rawInput: input.rawInput,
    materials: null,
    conclusionCandidates: [],
    selectedConclusion: null,
    speechPlan: null,
    script: null,
    rehearsal: null,
    feedback: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyLocalSessionUpdate({
  current,
  input,
  now,
}: {
  current: SessionRecord;
  input: UpdateSessionRequest;
  now: string;
}): SessionRecord {
  return {
    ...current,
    title: input.title ?? current.title,
    rawInput: input.rawInput ?? current.rawInput,
    materials:
      input.materials === undefined ? current.materials : input.materials,
    conclusionCandidates:
      input.conclusionCandidates ?? current.conclusionCandidates,
    selectedConclusion:
      input.selectedConclusion === undefined
        ? current.selectedConclusion
        : input.selectedConclusion,
    speechPlan:
      input.speechPlan === undefined ? current.speechPlan : input.speechPlan,
    script: input.script === undefined ? current.script : input.script,
    rehearsal:
      input.rehearsal === undefined ? current.rehearsal : input.rehearsal,
    feedback: input.feedback === undefined ? current.feedback : input.feedback,
    updatedAt: now,
  };
}

export function sortLocalSessions(sessions: SessionRecord[]) {
  return [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listOwnerSessions({
  sessions,
  ownerKey,
  limit = 50,
}: {
  sessions: SessionRecord[];
  ownerKey: string;
  limit?: number;
}) {
  return sortLocalSessions(
    sessions.filter((session) => session.ownerKey === ownerKey),
  ).slice(0, limit);
}
