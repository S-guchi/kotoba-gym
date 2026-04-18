import {
  Session,
  type SessionConfig,
  getTopicById,
  getTopics,
} from "@kotoba-gym/core";
import type { ServerConfig } from "./config.js";

interface StoredSession {
  session: Session;
  updatedAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000;

export class SessionStore {
  private sessions = new Map<string, StoredSession>();

  constructor(private readonly config: ServerConfig) {}

  topics() {
    return getTopics();
  }

  async create(topicId: string) {
    this.cleanup();

    const topic = getTopicById(topicId);
    const sessionConfig: SessionConfig = {
      geminiApiKey: this.config.geminiApiKey,
      geminiModel: this.config.geminiModel,
      maxTurns: this.config.maxTurns,
      judgeTemperature: this.config.judgeTemperature,
      personaTemperature: this.config.personaTemperature,
      logDir: this.config.logDir,
    };
    const session = new Session(topic, sessionConfig);
    const { openingMessage } = await session.start();
    const sessionId = crypto.randomUUID();

    this.sessions.set(sessionId, {
      session,
      updatedAt: Date.now(),
    });

    return {
      sessionId,
      openingMessage,
      topic,
      checklist: session.toJSON().checklist,
      maxTurns: this.config.maxTurns,
    };
  }

  get(sessionId: string): Session {
    const stored = this.sessions.get(sessionId);
    if (!stored) {
      throw new Error("Session not found");
    }
    stored.updatedAt = Date.now();
    return stored.session;
  }

  private cleanup() {
    const now = Date.now();
    for (const [sessionId, stored] of this.sessions.entries()) {
      if (now - stored.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
