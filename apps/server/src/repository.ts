import type {
  CreateSessionRequest,
  SessionRecord,
  UpdateSessionRequest,
} from "@kotoba-gym/core";
import { SessionRecordSchema } from "@kotoba-gym/core";
import type { D1DatabaseLike } from "./config.js";

type SessionRow = {
  id: string;
  owner_key: string;
  scene: string;
  title: string;
  raw_input: string;
  materials_json: string | null;
  conclusions_json: string | null;
  selected_conclusion_json: string | null;
  speech_plan_json: string | null;
  script_json: string | null;
  rehearsal_json: string | null;
  feedback_json: string | null;
  created_at: string;
  updated_at: string;
};

export interface SessionRepository {
  create(input: CreateSessionRequest): Promise<SessionRecord>;
  update(
    id: string,
    input: UpdateSessionRequest,
  ): Promise<SessionRecord | null>;
  list(ownerKey: string): Promise<SessionRecord[]>;
  get(id: string, ownerKey: string): Promise<SessionRecord | null>;
}

function parseJson<T>(value: string | null, fallback: T): T {
  return value ? (JSON.parse(value) as T) : fallback;
}

function rowToSession(row: SessionRow): SessionRecord {
  return SessionRecordSchema.parse({
    id: row.id,
    ownerKey: row.owner_key,
    scene: row.scene,
    title: row.title,
    rawInput: row.raw_input,
    materials: parseJson(row.materials_json, null),
    conclusionCandidates: parseJson(row.conclusions_json, []),
    selectedConclusion: parseJson(row.selected_conclusion_json, null),
    speechPlan: parseJson(row.speech_plan_json, null),
    script: parseJson(row.script_json, null),
    rehearsal: parseJson(row.rehearsal_json, null),
    feedback: parseJson(row.feedback_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function stringify(value: unknown) {
  return value === null || value === undefined ? null : JSON.stringify(value);
}

export class D1SessionRepository implements SessionRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async create(input: CreateSessionRequest) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const title = input.title?.trim() || "新しい整理";

    await this.db
      .prepare(
        `INSERT INTO sessions (
          id, owner_key, scene, title, raw_input, conclusions_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.ownerKey,
        input.scene,
        title,
        input.rawInput,
        "[]",
        now,
        now,
      )
      .run();

    const session = await this.get(id, input.ownerKey);
    if (!session) {
      throw new Error("created session was not found");
    }
    return session;
  }

  async update(id: string, input: UpdateSessionRequest) {
    const current = await this.get(id, input.ownerKey);
    if (!current) {
      return null;
    }

    const next: SessionRecord = {
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
      feedback:
        input.feedback === undefined ? current.feedback : input.feedback,
      updatedAt: new Date().toISOString(),
    };

    await this.db
      .prepare(
        `UPDATE sessions SET
          title = ?,
          raw_input = ?,
          materials_json = ?,
          conclusions_json = ?,
          selected_conclusion_json = ?,
          speech_plan_json = ?,
          script_json = ?,
          rehearsal_json = ?,
          feedback_json = ?,
          updated_at = ?
        WHERE id = ? AND owner_key = ?`,
      )
      .bind(
        next.title,
        next.rawInput,
        stringify(next.materials),
        stringify(next.conclusionCandidates),
        stringify(next.selectedConclusion),
        stringify(next.speechPlan),
        stringify(next.script),
        stringify(next.rehearsal),
        stringify(next.feedback),
        next.updatedAt,
        id,
        input.ownerKey,
      )
      .run();

    return this.get(id, input.ownerKey);
  }

  async list(ownerKey: string) {
    const result = await this.db
      .prepare(
        "SELECT * FROM sessions WHERE owner_key = ? ORDER BY updated_at DESC LIMIT 50",
      )
      .bind(ownerKey)
      .all<SessionRow>();
    return result.results.map(rowToSession);
  }

  async get(id: string, ownerKey: string) {
    const row = await this.db
      .prepare("SELECT * FROM sessions WHERE id = ? AND owner_key = ?")
      .bind(id, ownerKey)
      .first<SessionRow>();
    return row ? rowToSession(row) : null;
  }
}
