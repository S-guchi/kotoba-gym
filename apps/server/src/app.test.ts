import type { CreateSessionRequest, SessionRecord } from "@kotoba-gym/core";
import { describe, expect, test } from "vitest";
import { createApp } from "./app.js";
import type { JsonGenerator } from "./gemini-client.js";
import type { SessionRepository } from "./repository.js";

function createRepository(): SessionRepository {
  const sessions = new Map<string, SessionRecord>();

  return {
    async create(input: CreateSessionRequest) {
      const now = "2026-04-25T00:00:00.000Z";
      const session: SessionRecord = {
        id: `session-${sessions.size + 1}`,
        ownerKey: input.ownerKey,
        scene: input.scene,
        title: input.title ?? "新しい整理",
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
      sessions.set(session.id, session);
      return session;
    },
    async update(id, input) {
      const current = sessions.get(id);
      if (!current || current.ownerKey !== input.ownerKey) {
        return null;
      }
      const next = {
        ...current,
        materials:
          input.materials === undefined ? current.materials : input.materials,
        title: input.title ?? current.title,
        updatedAt: "2026-04-25T00:00:01.000Z",
      };
      sessions.set(id, next);
      return next;
    },
    async list(ownerKey) {
      return [...sessions.values()].filter(
        (session) => session.ownerKey === ownerKey,
      );
    },
    async get(id, ownerKey) {
      const session = sessions.get(id);
      return session?.ownerKey === ownerKey ? session : null;
    },
  };
}

const generator: JsonGenerator = {
  async generateJson(prompt) {
    if (prompt.includes("一番伝えたいこと")) {
      return {
        candidates: [
          { id: "a", label: "A", text: "CIを導入したい" },
          { id: "b", label: "B", text: "設計を相談したい" },
          { id: "c", label: "C", text: "最低限から始めたい" },
        ],
      };
    }
    return {
      materials: {
        title: "CI導入の相談",
        items: [
          {
            key: "current",
            title: "現状",
            content: "手動で確認している",
          },
        ],
      },
    };
  },
};

describe.each([
  ["/health", 200],
  ["/v1/sessions?ownerKey=owner-1", 200],
])("GET %s", (path, status) => {
  test(`status ${status} を返す`, async () => {
    const app = createApp({
      config: { geminiApiKey: "test", geminiModel: "test" },
      generator,
      repository: createRepository(),
    });
    const response = await app.request(path);
    expect(response.status).toBe(status);
  });
});

describe.each([
  ["/v1/organize", { scene: "free", rawInput: "CIについて相談したい" }, 200],
  ["/v1/organize", { scene: "invalid", rawInput: "" }, 400],
  [
    "/v1/conclusions",
    {
      scene: "free",
      rawInput: "CIについて相談したい",
      materials: {
        title: "CI導入の相談",
        items: [{ key: "current", title: "現状", content: "手動" }],
      },
    },
    200,
  ],
])("POST %s", (path, body, status) => {
  test(`status ${status} を返す`, async () => {
    const app = createApp({
      config: { geminiApiKey: "test", geminiModel: "test" },
      generator,
      repository: createRepository(),
    });
    const response = await app.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(status);
  });
});
