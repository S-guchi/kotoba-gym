import type { SessionRecord } from "@kotoba-gym/core";
import { describe, expect, test } from "vitest";
import {
  applyLocalSessionUpdate,
  createLocalSessionRecord,
  listOwnerSessions,
  parseStoredSessions,
} from "./session-store-core";

const baseSession: SessionRecord = {
  id: "session-1",
  ownerKey: "owner-1",
  title: "CI導入の相談",
  rawInput: "CIについて相談したい",
  materials: null,
  conclusionCandidates: [],
  selectedConclusion: null,
  speechPlan: null,
  script: null,
  rehearsal: null,
  feedback: null,
  createdAt: "2026-04-25T00:00:00.000Z",
  updatedAt: "2026-04-25T00:00:00.000Z",
};

describe.each([
  [
    "入力からローカルセッションを作る",
    {
      id: "session-1",
      input: {
        ownerKey: "owner-1",
        rawInput: "CIについて相談したい",
        title: "CI導入",
      },
      now: "2026-04-25T00:00:00.000Z",
    },
    {
      id: "session-1",
      ownerKey: "owner-1",
      title: "CI導入",
      rawInput: "CIについて相談したい",
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z",
    },
  ],
])("createLocalSessionRecord", (_name, input, expected) => {
  test("初期値を含む SessionRecord を返す", () => {
    expect(createLocalSessionRecord(input)).toMatchObject(expected);
  });
});

describe.each([
  [
    "title と materials だけ更新する",
    {
      current: baseSession,
      input: {
        ownerKey: "owner-1",
        title: "整理済み",
        materials: {
          title: "整理済み",
          items: [
            { key: "current" as const, title: "現状", content: "手動運用" },
          ],
        },
      },
      now: "2026-04-25T00:00:01.000Z",
    },
    {
      title: "整理済み",
      rawInput: "CIについて相談したい",
      materials: {
        title: "整理済み",
        items: [{ key: "current", title: "現状", content: "手動運用" }],
      },
      updatedAt: "2026-04-25T00:00:01.000Z",
    },
  ],
])("applyLocalSessionUpdate", (_name, input, expected) => {
  test("未指定フィールドを保持して指定フィールドだけ更新する", () => {
    expect(applyLocalSessionUpdate(input)).toMatchObject(expected);
  });
});

describe.each([
  [
    "owner のセッションだけを新しい順に返す",
    [
      {
        ...baseSession,
        id: "old",
        updatedAt: "2026-04-25T00:00:00.000Z",
      },
      {
        ...baseSession,
        id: "other-owner",
        ownerKey: "owner-2",
        updatedAt: "2026-04-25T00:00:02.000Z",
      },
      {
        ...baseSession,
        id: "new",
        updatedAt: "2026-04-25T00:00:03.000Z",
      },
    ],
    ["new", "old"],
  ],
])("listOwnerSessions", (_name, sessions, expectedIds) => {
  test("ownerKey で絞り込んで updatedAt 降順にする", () => {
    expect(
      listOwnerSessions({ sessions, ownerKey: "owner-1" }).map(
        (session) => session.id,
      ),
    ).toEqual(expectedIds);
  });
});

describe.each([
  ["正しい JSON", JSON.stringify([baseSession]), true],
  ["不正な JSON", "{", false],
  ["schema 不一致", JSON.stringify([{ id: "session-1" }]), false],
])("parseStoredSessions", (_name, value, expected) => {
  test("保存 JSON を検証する", () => {
    if (expected) {
      expect(parseStoredSessions(value)).toEqual([baseSession]);
      return;
    }

    expect(() => parseStoredSessions(value)).toThrow();
  });
});
