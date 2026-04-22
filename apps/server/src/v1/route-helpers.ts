import { PreviousAttemptPayloadSchema } from "@kotoba-gym/core";
import { z } from "zod";
import { ApiError } from "./api-error.js";

export interface AudioFileLike {
  name: string;
  type: string;
}

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

export function jsonApiError(error: ApiError) {
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

export function parseEvaluationFields(form: FormData) {
  return EvaluationFieldsSchema.parse({
    promptId: form.get("promptId"),
    attemptNumber: form.get("attemptNumber") ?? "1",
    locale: form.get("locale") ?? "ja-JP",
    previousAttemptSummary: form.get("previousAttemptSummary") ?? undefined,
  });
}

export function parsePreviousEvaluation(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return undefined;
  }

  return PreviousAttemptPayloadSchema.parse(JSON.parse(raw));
}

export function resolveAudioMimeType(file: AudioFileLike): string {
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

export function assertSupportedAudioMimeType(mimeType: string) {
  if (!SUPPORTED_AUDIO_MIME_TYPES.has(mimeType)) {
    throw new ApiError(
      "対応していない音声形式です。m4a で再録音してください。",
      400,
      "unsupported_audio_format",
    );
  }

  return mimeType;
}

export function toRouteApiError(error: unknown): ApiError {
  if (error instanceof z.ZodError) {
    return new ApiError(
      "入力が不正です。録音データを確認して再試行してください。",
      400,
      "invalid_request",
    );
  }

  if (error instanceof Error && error.message.includes("Practice prompt")) {
    return new ApiError("お題が見つかりません。", 404, "prompt_not_found");
  }

  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError("評価の生成に失敗しました。", 500, "evaluation_failed");
}
