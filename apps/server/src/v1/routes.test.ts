import type {
  AttemptEvaluation,
  PersonalizedPracticePrompt,
} from "@kotoba-gym/core";
import { scoreAxes } from "@kotoba-gym/core";
import { describe, expect, test } from "vitest";
import { createApp } from "../app.js";
import { createPracticeSessionRecord } from "../lib/session-record.js";
import { InMemoryAppRepository } from "../repositories/app-repository.js";

const ownerKey = "owner-1";

const prompt: PersonalizedPracticePrompt = {
  id: "personalized-1",
  category: "tech-explanation",
  title: "API キャッシュ戦略の説明",
  prompt: "API キャッシュ戦略を説明してください。",
  situation: "相手は結論を先に知りたがっています。",
  goals: ["最初に結論を置く", "改善点を分けて話す"],
  durationLabel: "60〜90秒",
  personalized: true,
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
  form.append("promptId", prompt.id);
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

  const session = createPracticeSessionRecord({
    id: "session-1",
    prompt,
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
