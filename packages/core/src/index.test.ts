import { describe, expect, test } from "vitest";
import {
  CreateSessionRequestSchema,
  FeedbackRequestSchema,
  FeedbackSchema,
  OrganizePackageResponseSchema,
  RehearsalResultSchema,
  SessionRecordSchema,
  TranscribeAudioRequestSchema,
} from "./index.js";

describe.each([
  [{ ownerKey: "owner-1", rawInput: "相談したい" }, true],
  [{ ownerKey: "", rawInput: "相談したい" }, false],
  [{ ownerKey: "owner-1", rawInput: "" }, true],
])("CreateSessionRequestSchema", (value, expected) => {
  test("作成リクエストを検証する", () => {
    expect(CreateSessionRequestSchema.safeParse(value).success).toBe(expected);
  });
});

describe.each([
  [{ audioBase64: "AAAA", mimeType: "audio/m4a" }, true],
  [{ audioBase64: "", mimeType: "audio/m4a" }, false],
  [{ audioBase64: "AAAA", mimeType: "" }, false],
])("TranscribeAudioRequestSchema", (value, expected) => {
  test("音声文字起こしリクエストを検証する", () => {
    expect(TranscribeAudioRequestSchema.safeParse(value).success).toBe(
      expected,
    );
  });
});

describe.each([
  [
    {
      materials: {
        title: "CI導入の相談",
        items: [{ key: "current", title: "現状", content: "手動確認" }],
      },
      conclusionCandidates: [
        { id: "a", label: "A", text: "最低限のCIを入れたい" },
        { id: "b", label: "B", text: "確認漏れを減らしたい" },
        { id: "c", label: "C", text: "自動化を相談したい" },
      ],
      selectedConclusion: {
        id: "a",
        label: "A",
        text: "最低限のCIを入れたい",
      },
      speechPlan: {
        title: "おすすめの伝え方",
        lead: "現状から相談につなげます。",
        steps: [{ order: 1, title: "現状", content: "手動で確認している" }],
      },
      script: { thirtySecond: "最低限のCIを入れたいです。", keywords: ["CI"] },
    },
    true,
  ],
  [
    {
      materials: {
        title: "CI導入の相談",
        items: [{ key: "current", title: "現状", content: "手動確認" }],
      },
      conclusionCandidates: [
        { id: "a", label: "A", text: "最低限のCIを入れたい" },
      ],
      selectedConclusion: {
        id: "a",
        label: "A",
        text: "最低限のCIを入れたい",
      },
      speechPlan: {
        title: "おすすめの伝え方",
        lead: "現状から相談につなげます。",
        steps: [{ order: 1, title: "現状", content: "手動で確認している" }],
      },
      script: { thirtySecond: "最低限のCIを入れたいです。", keywords: ["CI"] },
    },
    false,
  ],
])("OrganizePackageResponseSchema", (value, expected) => {
  test("整理パッケージを検証する", () => {
    expect(OrganizePackageResponseSchema.safeParse(value).success).toBe(
      expected,
    );
  });
});

describe.each([
  [
    {
      recorded: true,
      durationSeconds: 28,
      spokenText: "最低限のCIから始めたいです",
      recordedAt: "2026-04-25T00:00:00.000Z",
    },
    true,
  ],
  [{ recorded: true, durationSeconds: 28, spokenText: "" }, false],
])("RehearsalResultSchema", (value, expected) => {
  test("実際に話した内容を検証する", () => {
    expect(RehearsalResultSchema.safeParse(value).success).toBe(expected);
  });
});

describe.each([
  [
    {
      positives: ["結論が見えています"],
      improvements: ["依頼を具体化できます"],
      nextPhrase: "まずは最低限から相談したいです",
      before: "CIの話なんだけど",
      after: "最低限のCIから始めてよいか相談したいです",
      structureLevel: 3,
    },
    true,
  ],
  [
    {
      positives: [],
      improvements: [],
      nextPhrase: "",
      before: "",
      after: "",
      structureLevel: 6,
    },
    false,
  ],
])("FeedbackSchema", (value, expected) => {
  test("フィードバックを検証する", () => {
    expect(FeedbackSchema.safeParse(value).success).toBe(expected);
  });
});

describe.each([
  [
    {
      rawInput: "CIについて相談したい",
      materials: {
        title: "CI導入の相談",
        items: [{ key: "current", title: "現状", content: "手動確認" }],
      },
      conclusion: { id: "a", label: "A", text: "最低限のCIを入れたい" },
      speechPlan: {
        title: "おすすめの伝え方",
        lead: "現状から相談につなげます。",
        steps: [{ order: 1, title: "現状", content: "手動で確認している" }],
      },
      script: { thirtySecond: "最低限のCIを入れたいです。", keywords: ["CI"] },
      rehearsal: {
        recorded: true,
        durationSeconds: 28,
        spokenText: "最低限のCIから始めたいです",
      },
    },
    true,
  ],
  [
    {
      rawInput: "CIについて相談したい",
      conclusion: { id: "a", label: "A", text: "最低限のCIを入れたい" },
      speechPlan: {
        title: "おすすめの伝え方",
        lead: "現状から相談につなげます。",
        steps: [{ order: 1, title: "現状", content: "手動で確認している" }],
      },
      script: { thirtySecond: "最低限のCIを入れたいです。", keywords: ["CI"] },
      rehearsal: {
        recorded: true,
        durationSeconds: 28,
        spokenText: "最低限のCIから始めたいです",
      },
    },
    false,
  ],
])("FeedbackRequestSchema", (value, expected) => {
  test("整理済み内容と実発話を検証する", () => {
    expect(FeedbackRequestSchema.safeParse(value).success).toBe(expected);
  });
});

describe.each([
  [
    {
      id: "session-1",
      ownerKey: "owner-1",
      title: "相談",
      rawInput: "相談したい",
      materials: null,
      conclusionCandidates: [],
      selectedConclusion: null,
      speechPlan: null,
      script: null,
      rehearsal: null,
      feedback: null,
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z",
    },
    true,
  ],
  [
    {
      id: "session-1",
      ownerKey: "owner-1",
      title: "相談",
      rawInput: "相談したい",
      createdAt: "invalid",
      updatedAt: "invalid",
    },
    false,
  ],
])("SessionRecordSchema", (value, expected) => {
  test("セッション全体を検証する", () => {
    expect(SessionRecordSchema.safeParse(value).success).toBe(expected);
  });
});
