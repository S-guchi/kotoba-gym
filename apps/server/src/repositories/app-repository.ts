import {
  type PersonalizationProfile,
  PersonalizationProfileSchema,
  type PersonalizedPracticePrompt,
  PersonalizedPracticePromptSchema,
  type PracticeSessionRecord,
  PracticeSessionRecordSchema,
} from "@kotoba-gym/core";
import {
  createPracticeSessionRecord,
  createSessionId,
  sortPracticeSessions,
} from "../lib/session-record.js";

export interface AppRepository {
  clearPersonalization(ownerKey: string): Promise<void>;
  createSession(params: {
    ownerKey: string;
    prompt: PersonalizedPracticePrompt;
  }): Promise<PracticeSessionRecord>;
  getProfile(ownerKey: string): Promise<PersonalizationProfile | null>;
  getPrompt(params: {
    ownerKey: string;
    promptId: string;
  }): Promise<PersonalizedPracticePrompt | null>;
  getSession(params: {
    ownerKey: string;
    sessionId: string;
  }): Promise<PracticeSessionRecord | null>;
  listPrompts(ownerKey: string): Promise<PersonalizedPracticePrompt[]>;
  listSessions(ownerKey: string): Promise<PracticeSessionRecord[]>;
  saveProfile(params: {
    ownerKey: string;
    profile: PersonalizationProfile;
  }): Promise<PersonalizationProfile>;
  savePrompts(params: {
    ownerKey: string;
    prompts: PersonalizedPracticePrompt[];
  }): Promise<PersonalizedPracticePrompt[]>;
  saveSession(params: {
    ownerKey: string;
    session: PracticeSessionRecord;
  }): Promise<PracticeSessionRecord>;
}

function parseProfile(raw: string) {
  return PersonalizationProfileSchema.parse(JSON.parse(raw));
}

function parsePrompt(raw: string) {
  return PersonalizedPracticePromptSchema.parse(JSON.parse(raw));
}

function parseSession(raw: string) {
  return PracticeSessionRecordSchema.parse(JSON.parse(raw));
}

export class D1AppRepository implements AppRepository {
  constructor(private readonly db: D1Database) {}

  async clearPersonalization(ownerKey: string) {
    await this.db.batch([
      this.db
        .prepare("DELETE FROM sessions WHERE owner_key = ?")
        .bind(ownerKey),
      this.db.prepare("DELETE FROM prompts WHERE owner_key = ?").bind(ownerKey),
      this.db
        .prepare("DELETE FROM profiles WHERE owner_key = ?")
        .bind(ownerKey),
    ]);
  }

  async createSession(params: {
    ownerKey: string;
    prompt: PersonalizedPracticePrompt;
  }) {
    const now = new Date().toISOString();
    const session = createPracticeSessionRecord({
      id: createSessionId(),
      prompt: params.prompt,
      now,
    });

    await this.saveSession({
      ownerKey: params.ownerKey,
      session,
    });

    return session;
  }

  async getProfile(ownerKey: string) {
    const row = await this.db
      .prepare("SELECT profile_json FROM profiles WHERE owner_key = ?")
      .bind(ownerKey)
      .first<{ profile_json: string }>();

    if (!row) {
      return null;
    }

    return parseProfile(row.profile_json);
  }

  async getPrompt(params: { ownerKey: string; promptId: string }) {
    const row = await this.db
      .prepare("SELECT prompt_json FROM prompts WHERE owner_key = ? AND id = ?")
      .bind(params.ownerKey, params.promptId)
      .first<{ prompt_json: string }>();

    if (!row) {
      return null;
    }

    return parsePrompt(row.prompt_json);
  }

  async getSession(params: { ownerKey: string; sessionId: string }) {
    const row = await this.db
      .prepare(
        "SELECT session_json FROM sessions WHERE owner_key = ? AND id = ?",
      )
      .bind(params.ownerKey, params.sessionId)
      .first<{ session_json: string }>();

    if (!row) {
      return null;
    }

    return parseSession(row.session_json);
  }

  async listPrompts(ownerKey: string) {
    const result = await this.db
      .prepare(
        "SELECT prompt_json FROM prompts WHERE owner_key = ? ORDER BY updated_at DESC, created_at DESC",
      )
      .bind(ownerKey)
      .all<{ prompt_json: string }>();

    return (result.results ?? []).map((row) => parsePrompt(row.prompt_json));
  }

  async listSessions(ownerKey: string) {
    const result = await this.db
      .prepare(
        "SELECT session_json FROM sessions WHERE owner_key = ? ORDER BY updated_at DESC",
      )
      .bind(ownerKey)
      .all<{ session_json: string }>();

    return sortPracticeSessions(
      (result.results ?? []).map((row) => parseSession(row.session_json)),
    );
  }

  async saveProfile(params: {
    ownerKey: string;
    profile: PersonalizationProfile;
  }) {
    const parsed = PersonalizationProfileSchema.parse(params.profile);
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO profiles (owner_key, profile_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(owner_key) DO UPDATE SET
           profile_json = excluded.profile_json,
           updated_at = excluded.updated_at`,
      )
      .bind(params.ownerKey, JSON.stringify(parsed), now)
      .run();

    return parsed;
  }

  async savePrompts(params: {
    ownerKey: string;
    prompts: PersonalizedPracticePrompt[];
  }) {
    const parsed = params.prompts.map((prompt) =>
      PersonalizedPracticePromptSchema.parse(prompt),
    );
    const now = new Date().toISOString();

    await this.db
      .prepare("DELETE FROM prompts WHERE owner_key = ?")
      .bind(params.ownerKey)
      .run();

    if (parsed.length > 0) {
      await this.db.batch(
        parsed.map((prompt) =>
          this.db
            .prepare(
              `INSERT INTO prompts (owner_key, id, prompt_json, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?)`,
            )
            .bind(params.ownerKey, prompt.id, JSON.stringify(prompt), now, now),
        ),
      );
    }

    return parsed;
  }

  async saveSession(params: {
    ownerKey: string;
    session: PracticeSessionRecord;
  }) {
    const parsed = PracticeSessionRecordSchema.parse(params.session);

    await this.db
      .prepare(
        `INSERT INTO sessions (owner_key, id, session_json, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(owner_key, id) DO UPDATE SET
           session_json = excluded.session_json,
           updated_at = excluded.updated_at`,
      )
      .bind(
        params.ownerKey,
        parsed.id,
        JSON.stringify(parsed),
        parsed.updatedAt,
      )
      .run();

    return parsed;
  }
}

export class InMemoryAppRepository implements AppRepository {
  private readonly profiles = new Map<string, PersonalizationProfile>();
  private readonly prompts = new Map<
    string,
    Map<string, PersonalizedPracticePrompt>
  >();
  private readonly sessions = new Map<
    string,
    Map<string, PracticeSessionRecord>
  >();

  async clearPersonalization(ownerKey: string) {
    this.profiles.delete(ownerKey);
    this.prompts.delete(ownerKey);
    this.sessions.delete(ownerKey);
  }

  async createSession(params: {
    ownerKey: string;
    prompt: PersonalizedPracticePrompt;
  }) {
    const session = createPracticeSessionRecord({
      id: createSessionId(),
      prompt: params.prompt,
      now: new Date().toISOString(),
    });

    return this.saveSession({
      ownerKey: params.ownerKey,
      session,
    });
  }

  async getProfile(ownerKey: string) {
    return this.profiles.get(ownerKey) ?? null;
  }

  async getPrompt(params: { ownerKey: string; promptId: string }) {
    return this.prompts.get(params.ownerKey)?.get(params.promptId) ?? null;
  }

  async getSession(params: { ownerKey: string; sessionId: string }) {
    return this.sessions.get(params.ownerKey)?.get(params.sessionId) ?? null;
  }

  async listPrompts(ownerKey: string) {
    return [...(this.prompts.get(ownerKey)?.values() ?? [])];
  }

  async listSessions(ownerKey: string) {
    return sortPracticeSessions([
      ...(this.sessions.get(ownerKey)?.values() ?? []),
    ]);
  }

  async saveProfile(params: {
    ownerKey: string;
    profile: PersonalizationProfile;
  }) {
    const parsed = PersonalizationProfileSchema.parse(params.profile);
    this.profiles.set(params.ownerKey, parsed);
    return parsed;
  }

  async savePrompts(params: {
    ownerKey: string;
    prompts: PersonalizedPracticePrompt[];
  }) {
    const parsed = params.prompts.map((prompt) =>
      PersonalizedPracticePromptSchema.parse(prompt),
    );
    this.prompts.set(
      params.ownerKey,
      new Map(parsed.map((prompt) => [prompt.id, prompt])),
    );
    return parsed;
  }

  async saveSession(params: {
    ownerKey: string;
    session: PracticeSessionRecord;
  }) {
    const parsed = PracticeSessionRecordSchema.parse(params.session);
    const ownedSessions = this.sessions.get(params.ownerKey) ?? new Map();
    ownedSessions.set(parsed.id, parsed);
    this.sessions.set(params.ownerKey, ownedSessions);
    return parsed;
  }
}
