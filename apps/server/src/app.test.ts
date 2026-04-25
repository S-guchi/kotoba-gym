import { describe, expect, test } from "vitest";
import { createApp } from "./app.js";
import type { JsonGenerator } from "./gemini-client.js";

const generator: JsonGenerator = {
  async generateJson(prompt) {
    if (prompt.includes("説明構造")) {
      return {
        feedback: {
          positives: ["結論が先に出ています"],
          improvements: ["相談事項をもう少し具体化できます"],
          nextPhrase: "まずは最低限のCIから始めてよいでしょうか",
          before: "CIについて相談したい",
          after: "最低限のCI導入から進めてよいか相談したいです",
          structureLevel: 4,
        },
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
      conclusionCandidates: [
        { id: "a", label: "A", text: "CIを導入したい" },
        { id: "b", label: "B", text: "設計を相談したい" },
        { id: "c", label: "C", text: "最低限から始めたい" },
      ],
      selectedConclusion: { id: "c", label: "C", text: "最低限から始めたい" },
      speechPlan: {
        title: "おすすめの伝え方",
        lead: "現状から相談につなげます。",
        steps: [{ order: 1, title: "現状", content: "手動で確認している" }],
      },
      script: {
        thirtySecond: "まずは最低限のCIから始めたいです。",
        keywords: ["CI", "最低限"],
      },
    };
  },
  async generateJsonWithAudio() {
    return { text: "CIについて相談したいです" };
  },
};

describe.each([["/health", 200]])("GET %s", (path, status) => {
  test(`status ${status} を返す`, async () => {
    const app = createApp({
      config: { geminiApiKey: "test", geminiModel: "test" },
      generator,
    });
    const response = await app.request(path);
    expect(response.status).toBe(status);
  });
});

describe.each([
  ["GET", "/v1/sessions?ownerKey=owner-1"],
  ["POST", "/v1/sessions"],
  ["GET", "/v1/sessions/session-1?ownerKey=owner-1"],
  ["PUT", "/v1/sessions/session-1"],
])("%s %s", (method, path) => {
  test("session 永続化 API は提供しない", async () => {
    const app = createApp({
      config: { geminiApiKey: "test", geminiModel: "test" },
      generator,
    });
    const response = await app.request(path, { method });
    expect(response.status).toBe(404);
  });
});

describe.each([
  [
    "/v1/organize-package",
    { rawInput: "CIについて相談したい" },
    "missing_gemini_api_key",
  ],
])("GEMINI_API_KEY 未設定", (path, body, code) => {
  test("設定エラーを返す", async () => {
    const app = createApp();
    const response = await app.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code },
    });
  });
});

describe.each([
  ["/v1/transcribe", { audioBase64: "AAAA", mimeType: "audio/m4a" }, 200],
  ["/v1/transcribe", { audioBase64: "", mimeType: "audio/m4a" }, 400],
  ["/v1/organize-package", { rawInput: "CIについて相談したい" }, 200],
  ["/v1/organize-package", { rawInput: "" }, 400],
  [
    "/v1/feedback",
    {
      rawInput: "CIについて相談したい",
      materials: {
        title: "CI導入の相談",
        items: [{ key: "current", title: "現状", content: "手動" }],
      },
      conclusion: { id: "a", label: "A", text: "CIを導入したい" },
      speechPlan: {
        title: "おすすめの伝え方",
        lead: "現状から相談につなげます。",
        steps: [{ order: 1, title: "現状", content: "手動で確認している" }],
      },
      script: {
        thirtySecond: "まずは最低限のCIから始めたいです。",
        keywords: ["CI"],
      },
      rehearsal: {
        recorded: true,
        durationSeconds: 30,
        spokenText: "最低限のCIから始めたいです",
      },
    },
    200,
  ],
])("POST %s", (path, body, status) => {
  test(`status ${status} を返す`, async () => {
    const app = createApp({
      config: { geminiApiKey: "test", geminiModel: "test" },
      generator,
    });
    const response = await app.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(status);
  });
});
