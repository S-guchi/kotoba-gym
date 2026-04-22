import type { Hono } from "hono";
import type { ServerConfig, WorkerBindings } from "../config.js";
import {
  toPreviousAttemptPayload,
  upsertPracticeSessionAttempt,
} from "../lib/session-record.js";
import type { AppRepository } from "../repositories/app-repository.js";
import { ApiError, evaluateAttempt } from "./evaluation.js";
import { generatePersonalizedPrompts } from "./personalized-prompts.js";
import {
  assertSupportedAudioMimeType,
  jsonApiError,
  parseEvaluationFields,
  parseOwnerKey,
  parseProfilePayload,
  parsePromptGenerationPayload,
  parseSessionCreatePayload,
  resolveAudioMimeType,
  toRouteApiError,
} from "./route-helpers.js";

type AppType = Hono<{
  Bindings: WorkerBindings;
  Variables: {
    config: ServerConfig;
    repository: AppRepository;
  };
}>;

export function registerV1Routes(app: AppType) {
  app.get("/v1/profile", async (c) => {
    try {
      const ownerKey = parseOwnerKey(c.req.query("ownerKey"));
      const profile = await c.get("repository").getProfile(ownerKey);
      return c.json({ profile });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.put("/v1/profile", async (c) => {
    try {
      const payload = parseProfilePayload(await c.req.json());
      const profile = await c.get("repository").saveProfile(payload);
      return c.json({ profile });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.delete("/v1/personalization", async (c) => {
    try {
      const ownerKey = parseOwnerKey(c.req.query("ownerKey"));
      await c.get("repository").clearPersonalization(ownerKey);
      return c.json({ ok: true });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.get("/v1/prompts", async (c) => {
    try {
      const ownerKey = parseOwnerKey(c.req.query("ownerKey"));
      const prompts = await c.get("repository").listPrompts(ownerKey);
      return c.json({ prompts });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.post("/v1/personalized-prompts", async (c) => {
    try {
      const payload = parsePromptGenerationPayload(await c.req.json());
      const repository = c.get("repository");
      const config = c.get("config");

      await repository.saveProfile(payload);

      const prompts = await generatePersonalizedPrompts({
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        profile: payload.profile,
      });

      const saved = await repository.savePrompts({
        ownerKey: payload.ownerKey,
        prompts,
      });

      return c.json({ prompts: saved });
    } catch (error) {
      return jsonApiError(
        toRouteApiError(error, {
          message: "個人化お題の生成に失敗しました。",
          code: "personalized_prompt_generation_failed",
        }),
      );
    }
  });

  app.post("/v1/sessions", async (c) => {
    try {
      const payload = parseSessionCreatePayload(await c.req.json());
      const repository = c.get("repository");
      const prompt = await repository.getPrompt({
        ownerKey: payload.ownerKey,
        promptId: payload.promptId,
      });

      if (!prompt) {
        throw new ApiError("お題が見つかりません。", 404, "prompt_not_found");
      }

      const session = await repository.createSession({
        ownerKey: payload.ownerKey,
        prompt,
      });

      return c.json({ session });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.get("/v1/sessions", async (c) => {
    try {
      const ownerKey = parseOwnerKey(c.req.query("ownerKey"));
      const sessions = await c.get("repository").listSessions(ownerKey);
      return c.json({ sessions });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.get("/v1/sessions/:sessionId", async (c) => {
    try {
      const ownerKey = parseOwnerKey(c.req.query("ownerKey"));
      const session = await c.get("repository").getSession({
        ownerKey,
        sessionId: c.req.param("sessionId"),
      });

      if (!session) {
        throw new ApiError(
          "セッションが見つかりません。",
          404,
          "session_not_found",
        );
      }

      return c.json({ session });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.post("/v1/evaluations", async (c) => {
    try {
      const repository = c.get("repository");
      const config = c.get("config");
      const form = await c.req.formData();
      const parsedFields = parseEvaluationFields(form);
      const audio = form.get("audio");

      if (!(audio instanceof File)) {
        throw new ApiError("音声ファイルが必要です。", 400, "audio_required");
      }

      const session = await repository.getSession({
        ownerKey: parsedFields.ownerKey,
        sessionId: parsedFields.sessionId,
      });

      if (!session) {
        throw new ApiError(
          "セッションが見つかりません。",
          404,
          "session_not_found",
        );
      }

      if (session.prompt.id !== parsedFields.promptId) {
        throw new ApiError("お題が一致しません。", 400, "prompt_mismatch");
      }

      if (session.attempts.length >= 2) {
        throw new ApiError(
          "このセッションの回答は完了しています。",
          400,
          "attempt_limit_reached",
        );
      }

      const expectedAttemptNumber = session.attempts.length + 1;
      if (parsedFields.attemptNumber !== expectedAttemptNumber) {
        throw new ApiError(
          "回答の順序が不正です。最新の画面からやり直してください。",
          409,
          "attempt_number_mismatch",
        );
      }

      const mimeType = assertSupportedAudioMimeType(
        resolveAudioMimeType(audio),
      );
      console.log("[server][evaluation] received-audio", {
        promptId: parsedFields.promptId,
        attemptNumber: parsedFields.attemptNumber,
        fileName: audio.name,
        fileType: audio.type,
        inferredMimeType: mimeType,
        fileSize: audio.size,
      });

      const previousAttempt = session.attempts.at(-1);
      const evaluation = await evaluateAttempt({
        config,
        prompt: session.prompt,
        attemptNumber: parsedFields.attemptNumber,
        audio: new Uint8Array(await audio.arrayBuffer()),
        mimeType,
        locale: parsedFields.locale,
        previousAttemptSummary: previousAttempt?.evaluation.summary,
        previousEvaluation: previousAttempt
          ? toPreviousAttemptPayload(
              previousAttempt.attemptNumber,
              previousAttempt.evaluation,
            )
          : undefined,
      });

      const updatedSession = upsertPracticeSessionAttempt({
        record: session,
        attemptNumber: parsedFields.attemptNumber,
        evaluation,
        recordedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await repository.saveSession({
        ownerKey: parsedFields.ownerKey,
        session: updatedSession,
      });

      return c.json({
        attemptNumber: parsedFields.attemptNumber,
        evaluation,
        session: updatedSession,
      });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });
}
