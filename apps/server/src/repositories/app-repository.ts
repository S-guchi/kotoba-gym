import {
  type PracticeSessionRecord,
  PracticeSessionRecordSchema,
  type ThemeRecord,
  ThemeRecordSchema,
} from "@kotoba-gym/core";
import {
  createPracticeSessionRecord,
  createSessionId,
  sortPracticeSessions,
} from "../lib/session-record.js";

export interface AppRepository {
  createSession(params: {
    ownerKey: string;
    theme: ThemeRecord;
  }): Promise<PracticeSessionRecord>;
  getSession(params: {
    ownerKey: string;
    sessionId: string;
  }): Promise<PracticeSessionRecord | null>;
  getTheme(params: {
    ownerKey: string;
    themeId: string;
  }): Promise<ThemeRecord | null>;
  listSessions(ownerKey: string): Promise<PracticeSessionRecord[]>;
  listThemes(ownerKey: string): Promise<ThemeRecord[]>;
  saveSession(params: {
    ownerKey: string;
    session: PracticeSessionRecord;
  }): Promise<PracticeSessionRecord>;
  saveTheme(params: {
    ownerKey: string;
    theme: ThemeRecord;
  }): Promise<ThemeRecord>;
}

function parseTheme(raw: string) {
  return ThemeRecordSchema.parse(JSON.parse(raw));
}

function parseSession(raw: string) {
  return PracticeSessionRecordSchema.parse(JSON.parse(raw));
}

export class D1AppRepository implements AppRepository {
  constructor(private readonly db: D1Database) {}

  async createSession(params: {
    ownerKey: string;
    theme: ThemeRecord;
  }) {
    const now = new Date().toISOString();
    const session = createPracticeSessionRecord({
      id: createSessionId(),
      theme: params.theme,
      now,
    });

    await this.saveSession({
      ownerKey: params.ownerKey,
      session,
    });

    return session;
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

  async getTheme(params: { ownerKey: string; themeId: string }) {
    const row = await this.db
      .prepare("SELECT theme_json FROM themes WHERE owner_key = ? AND id = ?")
      .bind(params.ownerKey, params.themeId)
      .first<{ theme_json: string }>();

    if (!row) {
      return null;
    }

    return parseTheme(row.theme_json);
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

  async listThemes(ownerKey: string) {
    const result = await this.db
      .prepare(
        "SELECT theme_json FROM themes WHERE owner_key = ? ORDER BY updated_at DESC, created_at DESC",
      )
      .bind(ownerKey)
      .all<{ theme_json: string }>();

    return (result.results ?? []).map((row) => parseTheme(row.theme_json));
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

  async saveTheme(params: { ownerKey: string; theme: ThemeRecord }) {
    const parsed = ThemeRecordSchema.parse(params.theme);

    await this.db
      .prepare(
        `INSERT INTO themes (owner_key, id, theme_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(owner_key, id) DO UPDATE SET
           theme_json = excluded.theme_json,
           updated_at = excluded.updated_at`,
      )
      .bind(
        params.ownerKey,
        parsed.id,
        JSON.stringify(parsed),
        parsed.createdAt,
        parsed.updatedAt,
      )
      .run();

    return parsed;
  }
}

export class InMemoryAppRepository implements AppRepository {
  private readonly themes = new Map<string, Map<string, ThemeRecord>>();
  private readonly sessions = new Map<
    string,
    Map<string, PracticeSessionRecord>
  >();

  async createSession(params: {
    ownerKey: string;
    theme: ThemeRecord;
  }) {
    const session = createPracticeSessionRecord({
      id: createSessionId(),
      theme: params.theme,
      now: new Date().toISOString(),
    });

    return this.saveSession({
      ownerKey: params.ownerKey,
      session,
    });
  }

  async getSession(params: { ownerKey: string; sessionId: string }) {
    return this.sessions.get(params.ownerKey)?.get(params.sessionId) ?? null;
  }

  async getTheme(params: { ownerKey: string; themeId: string }) {
    return this.themes.get(params.ownerKey)?.get(params.themeId) ?? null;
  }

  async listSessions(ownerKey: string) {
    return sortPracticeSessions([
      ...(this.sessions.get(ownerKey)?.values() ?? []),
    ]);
  }

  async listThemes(ownerKey: string) {
    return [...(this.themes.get(ownerKey)?.values() ?? [])].sort(
      (left, right) => right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async saveSession(params: {
    ownerKey: string;
    session: PracticeSessionRecord;
  }) {
    const parsed = PracticeSessionRecordSchema.parse(params.session);
    const bucket = this.sessions.get(params.ownerKey) ?? new Map();
    bucket.set(parsed.id, parsed);
    this.sessions.set(params.ownerKey, bucket);
    return parsed;
  }

  async saveTheme(params: { ownerKey: string; theme: ThemeRecord }) {
    const parsed = ThemeRecordSchema.parse(params.theme);
    const bucket = this.themes.get(params.ownerKey) ?? new Map();
    bucket.set(parsed.id, parsed);
    this.themes.set(params.ownerKey, bucket);
    return parsed;
  }
}
