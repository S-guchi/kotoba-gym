import { describe, expect, test } from "vitest";
import {
  CreateSessionRequestSchema,
  FeedbackSchema,
  SceneSchema,
  SessionRecordSchema,
} from "./index.js";

describe.each([
  ["work_consultation", true],
  ["meeting", true],
  ["interview", true],
  ["partner", true],
  ["free", true],
  ["unknown", false],
])("SceneSchema", (value, expected) => {
  test(`scene=${value} の検証結果が ${expected} になる`, () => {
    expect(SceneSchema.safeParse(value).success).toBe(expected);
  });
});

describe.each([
  [{ ownerKey: "owner-1", scene: "free", rawInput: "相談したい" }, true],
  [{ ownerKey: "", scene: "free", rawInput: "相談したい" }, false],
  [{ ownerKey: "owner-1", scene: "other", rawInput: "相談したい" }, false],
])("CreateSessionRequestSchema", (value, expected) => {
  test("作成リクエストを検証する", () => {
    expect(CreateSessionRequestSchema.safeParse(value).success).toBe(expected);
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
      scene: "free",
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
      scene: "free",
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
