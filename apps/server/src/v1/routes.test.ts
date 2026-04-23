import type { AttemptEvaluation, ThemeRecord } from "@kotoba-gym/core";
import { scoreAxes } from "@kotoba-gym/core";
import { describe, expect, test } from "vitest";
import { createApp } from "../app.js";
import { createPracticeSessionRecord } from "../lib/session-record.js";
import { InMemoryAppRepository } from "../repositories/app-repository.js";

const ownerKey = "owner-1";

const theme: ThemeRecord = {
  id: "theme-1",
  title: "API キャッシュ戦略を説明する",
  userInput: {
    theme: "API キャッシュ戦略を見直した理由",
    audience: "新メンバー",
    goal: "設計意図を誤解なく理解してほしい",
  },
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

const evaluation: AttemptEvaluation = {
  transcript: "結論から説明します。",
  summary: "結論先出しはできています。",
  scores: scoreAxes.map((axis, index) => ({
    axis,
    score: Math.min(index + 1, 5),
    comment: `${axis} comment`,
  })),
  goodPoints: ["結論がある"],
  improvementPoints: ["具体例が少ない"],
  exampleAnswer: "結論、背景、効果の順で説明します。",
  nextFocus: "数字を1つ入れてください。",
  comparison: null,
};

function createEvaluationFormData(attemptNumber: number) {
  const form = new FormData();
  form.append("ownerKey", ownerKey);
  form.append("sessionId", "session-1");
  form.append("themeId", theme.id);
  form.append("attemptNumber", String(attemptNumber));
  form.append("locale", "ja-JP");
  form.append(
    "audio",
    new File(["audio"], "attempt.m4a", { type: "audio/m4a" }),
  );
  return form;
}

async function createAppWithSession(attemptCount: number) {
  const repository = new InMemoryAppRepository();

  await repository.saveTheme({
    ownerKey,
    theme,
  });

  const session = createPracticeSessionRecord({
    id: "session-1",
    theme,
    now: "2026-04-22T00:00:00.000Z",
  });

  await repository.saveSession({
    ownerKey,
    session: {
      ...session,
      attempts: Array.from({ length: attemptCount }, (_, index) => ({
        attemptNumber: index + 1,
        recordedAt: `2026-04-22T00:0${index + 1}:00.000Z`,
        evaluation,
      })),
      updatedAt: "2026-04-22T00:10:00.000Z",
    },
  });

  const app = createApp({
    config: {
      geminiApiKey: "test-key",
      geminiModel: "test-model",
    },
    repository,
  });

  return app;
}

describe.each([
  {
    name: "attempt number mismatch returns conflict",
    attemptCount: 1,
    attemptNumber: 1,
    expectedStatus: 409,
    expectedCode: "attempt_number_mismatch",
  },
  {
    name: "attempt limit is checked before mismatch",
    attemptCount: 2,
    attemptNumber: 1,
    expectedStatus: 400,
    expectedCode: "attempt_limit_reached",
  },
])(
  "POST /v1/evaluations guard checks",
  ({ attemptCount, attemptNumber, expectedStatus, expectedCode }) => {
    test.each([{ label: "request is rejected before evaluation starts" }])(
      "$label",
      async () => {
        const app = await createAppWithSession(attemptCount);
        const response = await app.request("/v1/evaluations", {
          method: "POST",
          body: createEvaluationFormData(attemptNumber),
        });

        expect(response.status).toBe(expectedStatus);
        await expect(response.json()).resolves.toMatchObject({
          error: {
            code: expectedCode,
          },
        });
      },
    );
  },
);
