import type { AttemptEvaluation, ThemeRecord } from "@kotoba-gym/core";
import { scoreAxes } from "@kotoba-gym/core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp } from "../app.js";
import {
  createPracticeSessionRecord,
  setSessionEvaluation,
} from "../lib/session-record.js";
import { InMemoryAppRepository } from "../repositories/app-repository.js";

const { mockGenerate, mockGenerateParts } = vi.hoisted(() => ({
  mockGenerate: vi.fn(),
  mockGenerateParts: vi.fn(),
}));

vi.mock("../lib/gemini-client.js", () => ({
  createLLMClient: () => ({
    generate: mockGenerate,
    generateParts: mockGenerateParts,
  }),
}));

const ownerKey = "owner-1";
const persona = {
  id: "persona-new-member",
  name: "新メンバー",
  description: "最近チームに加わったばかりで、プロジェクトの背景知識が少ない。",
  emoji: "🧑‍💻",
} as const;

const theme: ThemeRecord = {
  id: "theme-1",
  title: "API キャッシュ戦略を説明する",
  userInput: {
    theme: "API キャッシュ戦略を見直した理由",
    personaId: persona.id,
    goal: "設計意図を誤解なく理解してほしい",
  },
  persona,
  mission:
    "新メンバーに、キャッシュ戦略を見直した理由と設計意図が伝わるように説明してください。",
  audienceSummary: "相手は背景知識が浅く、結論から短く知りたがっています。",
  talkingPoints: [
    "どんな問題が起きていたか",
    "なぜ見直しが必要だったか",
    "どのように変えたか",
  ],
  recommendedStructure: [
    "最初に結論を一言で述べる",
    "見直し前の問題を共有する",
    "変更点と理由を順番に話す",
  ],
  durationLabel: "60〜90秒",
  createdAt: "2026-04-22T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

const llmEvaluation: AttemptEvaluation = {
  transcript: "結論から説明します。",
  summary: "結論先出しはできています。",
  scores: scoreAxes.map((axis, index) => ({
    axis,
    score: Math.min(index + 1, 5),
    comment: `${axis} comment`,
  })),
  goodPoints: ["結論がある", "短い"],
  improvementPoints: ["具体例が少ない", "数字がない"],
  exampleAnswer: "結論、背景、効果の順で説明します。",
  nextFocus: "数字を一つ入れてください。",
  comparison: null,
};

const llmEvaluationWithoutGoodPoints: AttemptEvaluation = {
  ...llmEvaluation,
  transcript: "[無音]",
  summary: "音声が確認できませんでした。",
  goodPoints: [],
};

interface EvaluationRouteResponse {
  evaluation: AttemptEvaluation;
  session: {
    evaluation: AttemptEvaluation;
  };
}

function createEvaluationFormData(sessionId: string, themeId: string) {
  const form = new FormData();
  form.append("ownerKey", ownerKey);
  form.append("sessionId", sessionId);
  form.append("themeId", themeId);
  form.append("locale", "ja-JP");
  form.append(
    "audio",
    new File(["audio"], "session.m4a", { type: "audio/m4a" }),
  );
  return form;
}

async function createAppWithRepository() {
  const repository = new InMemoryAppRepository();

  await repository.saveTheme({
    ownerKey,
    theme,
  });

  const app = createApp({
    config: {
      geminiApiKey: "test-key",
      geminiModel: "test-model",
    },
    repository,
  });

  return { app, repository };
}

afterEach(() => {
  mockGenerate.mockReset();
  mockGenerateParts.mockReset();
});

describe.each([
  {
    name: "returns seeded personas",
    expectedIds: [
      "persona-new-member",
      "persona-interviewer",
      "persona-manager",
      "persona-non-engineer",
    ],
  },
])("GET /v1/personas", ({ expectedIds }) => {
  test.each([{ label: "persona list is returned" }])("$label", async () => {
    const { app } = await createAppWithRepository();
    const response = await app.request("/v1/personas");

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      personas: Array<typeof persona>;
    };
    expect(payload.personas.map((item) => item.id)).toEqual(expectedIds);
  });
});

describe.each([
  {
    name: "theme is created with persona snapshot",
    request: {
      ownerKey,
      input: {
        theme: "API キャッシュ戦略を見直した理由",
        personaId: persona.id,
        goal: "設計意図を誤解なく理解してほしい",
      },
    },
  },
])("POST /v1/themes success", ({ request }) => {
  test.each([{ label: "theme payload is persisted with persona" }])(
    "$label",
    async () => {
      mockGenerate.mockResolvedValue(
        JSON.stringify({
          theme: {
            title: "API キャッシュ戦略を説明する",
            mission:
              "新メンバーに、キャッシュ戦略を見直した理由と設計意図が伝わるように説明してください。",
            audienceSummary:
              "相手は背景知識が浅く、結論から短く知りたがっています。",
            talkingPoints: [
              "どんな問題が起きていたか",
              "なぜ見直しが必要だったか",
              "どのように変えたか",
            ],
            recommendedStructure: [
              "最初に結論を一言で述べる",
              "見直し前の問題を共有する",
              "変更点と理由を順番に話す",
            ],
            durationLabel: "60〜90秒",
          },
        }),
      );
      const { app } = await createAppWithRepository();
      const response = await app.request("/v1/themes", {
        method: "POST",
        body: JSON.stringify(request),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        theme: {
          userInput: request.input,
          persona,
        },
      });
    },
  );
});

describe.each([
  {
    name: "unknown persona id is rejected",
    request: {
      ownerKey,
      input: {
        theme: "API キャッシュ戦略を見直した理由",
        personaId: "persona-unknown",
        goal: "設計意図を誤解なく理解してほしい",
      },
    },
  },
])("POST /v1/themes guards", ({ request }) => {
  test.each([{ label: "missing persona is rejected before generation" }])(
    "$label",
    async () => {
      const { app } = await createAppWithRepository();
      const response = await app.request("/v1/themes", {
        method: "POST",
        body: JSON.stringify(request),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({
        error: {
          code: "persona_not_found",
        },
      });
      expect(mockGenerate).not.toHaveBeenCalled();
    },
  );
});

describe.each([
  {
    name: "reject already evaluated session",
  },
])("POST /v1/evaluations guard checks", () => {
  test.each([{ label: "request is rejected before evaluation starts" }])(
    "$label",
    async () => {
      const { app, repository } = await createAppWithRepository();
      const seeded = createPracticeSessionRecord({
        id: "session-1",
        theme,
        now: "2026-04-22T00:00:00.000Z",
      });

      await repository.saveSession({
        ownerKey,
        session: setSessionEvaluation({
          record: seeded,
          evaluation: llmEvaluation,
          recordedAt: "2026-04-22T00:01:00.000Z",
          updatedAt: "2026-04-22T00:01:00.000Z",
        }),
      });

      const response = await app.request("/v1/evaluations", {
        method: "POST",
        body: createEvaluationFormData("session-1", theme.id),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: {
          code: "session_already_evaluated",
        },
      });
      expect(mockGenerateParts).not.toHaveBeenCalled();
    },
  );
});

describe.each([
  {
    name: "first session has no comparison",
    previousSession: null,
    expectedComparison: null,
  },
  {
    name: "later session compares against latest completed session",
    previousSession: {
      id: "session-0",
      createdAt: "2026-04-22T00:00:00.000Z",
      updatedAt: "2026-04-22T00:02:00.000Z",
      recordedAt: "2026-04-22T00:02:00.000Z",
    },
    expectedComparisonShape: {
      scoreDiffLength: scoreAxes.length,
      improvedPointsLength: 2,
      remainingPointsLength: 2,
    },
  },
])("POST /v1/evaluations success flow", ({ previousSession, ...expected }) => {
  test.each([{ label: "evaluation result is persisted to session" }])(
    "$label",
    async () => {
      mockGenerateParts.mockResolvedValue(JSON.stringify(llmEvaluation));
      const { app, repository } = await createAppWithRepository();

      const currentSession = createPracticeSessionRecord({
        id: "session-1",
        theme,
        now: "2026-04-22T00:03:00.000Z",
      });
      await repository.saveSession({
        ownerKey,
        session: currentSession,
      });

      if (previousSession) {
        const seeded = createPracticeSessionRecord({
          id: previousSession.id,
          theme,
          now: previousSession.createdAt,
        });
        await repository.saveSession({
          ownerKey,
          session: setSessionEvaluation({
            record: seeded,
            evaluation: llmEvaluation,
            recordedAt: previousSession.recordedAt,
            updatedAt: previousSession.updatedAt,
          }),
        });
      }

      const response = await app.request("/v1/evaluations", {
        method: "POST",
        body: createEvaluationFormData("session-1", theme.id),
      });

      expect(response.status).toBe(200);
      const payload = (await response.json()) as EvaluationRouteResponse;
      expect(payload.session.evaluation.summary).toBe(llmEvaluation.summary);

      if ("expectedComparison" in expected) {
        expect(payload.evaluation.comparison).toBe(expected.expectedComparison);
      } else {
        const comparison = payload.evaluation.comparison;
        expect(comparison).not.toBeNull();
        expect(comparison).toMatchObject({
          scoreDiff: expect.any(Array),
          improvedPoints: expect.any(Array),
          remainingPoints: expect.any(Array),
        });
        expect(comparison?.scoreDiff).toHaveLength(
          expected.expectedComparisonShape.scoreDiffLength,
        );
        expect(comparison?.improvedPoints).toHaveLength(
          expected.expectedComparisonShape.improvedPointsLength,
        );
        expect(comparison?.remainingPoints).toHaveLength(
          expected.expectedComparisonShape.remainingPointsLength,
        );
      }
    },
  );
});

describe.each([
  {
    name: "empty good points from llm are accepted",
  },
])("POST /v1/evaluations tolerant flow", () => {
  test.each([
    { label: "evaluation result is persisted even when goodPoints is empty" },
  ])("$label", async () => {
    mockGenerateParts.mockResolvedValue(
      JSON.stringify(llmEvaluationWithoutGoodPoints),
    );
    const { app, repository } = await createAppWithRepository();

    await repository.saveSession({
      ownerKey,
      session: createPracticeSessionRecord({
        id: "session-1",
        theme,
        now: "2026-04-22T00:03:00.000Z",
      }),
    });

    const response = await app.request("/v1/evaluations", {
      method: "POST",
      body: createEvaluationFormData("session-1", theme.id),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as EvaluationRouteResponse;
    expect(payload.evaluation.goodPoints).toEqual([]);
    expect(payload.session.evaluation.goodPoints).toEqual([]);
  });
});

describe.each([
  {
    name: "theme filter returns matching sessions only",
  },
])("GET /v1/sessions", () => {
  test.each([{ label: "theme scoped list is returned" }])(
    "$label",
    async () => {
      const otherTheme: ThemeRecord = {
        ...theme,
        id: "theme-2",
        title: "別テーマ",
      };
      const { app, repository } = await createAppWithRepository();
      await repository.saveTheme({
        ownerKey,
        theme: otherTheme,
      });
      await repository.saveSession({
        ownerKey,
        session: createPracticeSessionRecord({
          id: "session-1",
          theme,
          now: "2026-04-22T00:00:00.000Z",
        }),
      });
      await repository.saveSession({
        ownerKey,
        session: createPracticeSessionRecord({
          id: "session-2",
          theme: otherTheme,
          now: "2026-04-22T00:01:00.000Z",
        }),
      });

      const response = await app.request(
        `/v1/sessions?ownerKey=${ownerKey}&themeId=${theme.id}`,
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        sessions: [{ id: "session-1", theme: { id: theme.id } }],
      });
    },
  );
});
