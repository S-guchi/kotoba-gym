import {
  PersonalizationProfileSchema,
  getPracticePromptById,
  getPracticePrompts,
} from "@kotoba-gym/core";
import type { Hono } from "hono";
import type { ServerConfig } from "../config.js";
import { ApiError, evaluateAttempt } from "./evaluation.js";
import { generatePersonalizedPrompts } from "./personalized-prompts.js";
import {
  assertSupportedAudioMimeType,
  jsonApiError,
  parseEvaluationFields,
  parsePreviousEvaluation,
  resolveAudioMimeType,
  toRouteApiError,
} from "./route-helpers.js";

export function registerV1Routes(app: Hono, config: ServerConfig) {
  app.get("/v1/prompts", (c) => {
    return c.json({
      prompts: getPracticePrompts(),
    });
  });

  app.post("/v1/personalized-prompts", async (c) => {
    try {
      const profile = PersonalizationProfileSchema.parse(await c.req.json());
      const prompts = await generatePersonalizedPrompts({
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        profile,
      });

      return c.json({ prompts });
    } catch (error) {
      return jsonApiError(
        toRouteApiError(error, {
          message: "個人化お題の生成に失敗しました。",
          code: "personalized_prompt_generation_failed",
        }),
      );
    }
  });

  app.post("/v1/evaluations", async (c) => {
    try {
      const form = await c.req.formData();
      const parsedFields = parseEvaluationFields(form);
      const audio = form.get("audio");

      if (!(audio instanceof File)) {
        throw new ApiError("音声ファイルが必要です。", 400, "audio_required");
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

      const previousEvaluation = parsePreviousEvaluation(
        form.get("previousEvaluation"),
      );
      const prompt = getPracticePromptById(parsedFields.promptId);

      const evaluation = await evaluateAttempt({
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        promptId: parsedFields.promptId,
        attemptNumber: parsedFields.attemptNumber,
        audio: Buffer.from(await audio.arrayBuffer()),
        mimeType,
        locale: parsedFields.locale,
        previousAttemptSummary: parsedFields.previousAttemptSummary,
        previousEvaluation,
      });

      return c.json({
        prompt,
        attemptNumber: parsedFields.attemptNumber,
        evaluation,
      });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });
}
