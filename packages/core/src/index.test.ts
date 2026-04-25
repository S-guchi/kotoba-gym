import { describe, expect, test } from "vitest";
import {
  CreateSessionRequestSchema,
  FeedbackSchema,
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
