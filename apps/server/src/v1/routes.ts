import {
  PreviousAttemptPayloadSchema,
  getPracticePromptById,
  getPracticePrompts,
} from "@kotoba-gym/core";
import type { Hono } from "hono";
import { z } from "zod";
import type { ServerConfig } from "../config.js";
import { ApiError, evaluateAttempt } from "./evaluation.js";

const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  "audio/aac",
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/opus",
  "audio/wav",
  "audio/webm",
  "audio/x-wav",
]);

const MIME_TYPE_ALIASES: Record<string, string> = {
  "audio/mp4a-latm": "audio/m4a",
  "audio/x-m4a": "audio/m4a",
  "audio/x-wav": "audio/wav",
};

const EvaluationFieldsSchema = z.object({
  promptId: z.string().min(1),
  attemptNumber: z.coerce.number().int().min(1).max(2).default(1),
  locale: z.string().min(2).default("ja-JP"),
  previousAttemptSummary: z.string().optional(),
});

function jsonApiError(error: ApiError) {
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
      },
    },
    { status: error.status },
  );
}

function parsePreviousEvaluation(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return undefined;
  }

  return PreviousAttemptPayloadSchema.parse(JSON.parse(raw));
}

function inferMimeType(file: File): string {
  const lowerName = file.name.toLowerCase();
  const normalizedType = file.type.trim().toLowerCase();

  if (
    normalizedType &&
    normalizedType !== "application/octet-stream" &&
    normalizedType !== "binary/octet-stream"
  ) {
    return MIME_TYPE_ALIASES[normalizedType] ?? normalizedType;
  }

  if (lowerName.endsWith(".m4a")) {
    return "audio/m4a";
  }
  if (lowerName.endsWith(".mp4")) {
    return "audio/mp4";
  }
  if (lowerName.endsWith(".mp3")) {
    return "audio/mpeg";
  }
  if (lowerName.endsWith(".wav")) {
    return "audio/wav";
  }
  if (lowerName.endsWith(".aac")) {
    return "audio/aac";
  }
  if (lowerName.endsWith(".ogg")) {
    return "audio/ogg";
  }
  if (lowerName.endsWith(".webm")) {
    return "audio/webm";
  }

  return "audio/m4a";
}

export function registerV1Routes(app: Hono, config: ServerConfig) {
  app.get("/v1/prompts", (c) => {
    return c.json({
      prompts: getPracticePrompts(),
    });
  });

  app.post("/v1/evaluations", async (c) => {
    try {
      const form = await c.req.formData();
      const parsedFields = EvaluationFieldsSchema.parse({
        promptId: form.get("promptId"),
        attemptNumber: form.get("attemptNumber") ?? "1",
        locale: form.get("locale") ?? "ja-JP",
        previousAttemptSummary: form.get("previousAttemptSummary") ?? undefined,
      });
      const audio = form.get("audio");

      if (!(audio instanceof File)) {
        throw new ApiError(
          "音声ファイルが必要です。",
          400,
          "audio_required",
        );
      }

      const mimeType = inferMimeType(audio);
      console.log("[server][evaluation] received-audio", {
        promptId: parsedFields.promptId,
        attemptNumber: parsedFields.attemptNumber,
        fileName: audio.name,
        fileType: audio.type,
        inferredMimeType: mimeType,
        fileSize: audio.size,
      });
      if (!SUPPORTED_AUDIO_MIME_TYPES.has(mimeType)) {
        throw new ApiError(
          "対応していない音声形式です。m4a で再録音してください。",
          400,
          "unsupported_audio_format",
        );
      }

      const previousEvaluation = parsePreviousEvaluation(
        form.get("previousEvaluation"),
      );
      getPracticePromptById(parsedFields.promptId);

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
        prompt: getPracticePromptById(parsedFields.promptId),
        attemptNumber: parsedFields.attemptNumber,
        evaluation,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return jsonApiError(
          new ApiError(
            "入力が不正です。録音データを確認して再試行してください。",
            400,
            "invalid_request",
          ),
        );
      }

      if (error instanceof Error && error.message.includes("Practice prompt")) {
        return jsonApiError(
          new ApiError("お題が見つかりません。", 404, "prompt_not_found"),
        );
      }

      if (error instanceof ApiError) {
        return jsonApiError(error);
      }

      return jsonApiError(
        new ApiError(
          "評価の生成に失敗しました。",
          500,
          "evaluation_failed",
        ),
      );
    }
  });
}
