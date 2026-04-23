import { CreateThemeRequestSchema } from "@kotoba-gym/core";
import { z } from "zod";
import { ApiError } from "./api-error.js";

const OwnerKeySchema = z.string().trim().min(1).max(120);

const CreateThemePayloadSchema = z.object({
  ownerKey: OwnerKeySchema,
  input: CreateThemeRequestSchema,
});

const SessionCreateRequestSchema = z.object({
  ownerKey: OwnerKeySchema,
  themeId: z.string().trim().min(1),
});

const EvaluationFieldsSchema = z.object({
  ownerKey: OwnerKeySchema,
  sessionId: z.string().trim().min(1),
  themeId: z.string().trim().min(1),
  attemptNumber: z.coerce.number().int().min(1).max(2).default(1),
  locale: z.string().min(2).default("ja-JP"),
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

export function parseOwnerKey(raw: unknown) {
  return OwnerKeySchema.parse(raw);
}

export function parseCreateThemePayload(raw: unknown) {
  return CreateThemePayloadSchema.parse(raw);
}

export function parseSessionCreatePayload(raw: unknown) {
  return SessionCreateRequestSchema.parse(raw);
}

export function parseEvaluationFields(form: FormData) {
  return EvaluationFieldsSchema.parse({
    ownerKey: form.get("ownerKey"),
    sessionId: form.get("sessionId"),
    themeId: form.get("themeId"),
    attemptNumber: form.get("attemptNumber") ?? "1",
    locale: form.get("locale") ?? "ja-JP",
  });
}

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

export function toRouteApiError(
  error: unknown,
  fallback?: {
    message: string;
    code: string;
  },
): ApiError {
  if (error instanceof z.ZodError) {
    return new ApiError(
      "入力が不正です。内容を確認して再試行してください。",
      400,
      "invalid_request",
    );
  }

  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(
    fallback?.message ?? "評価の生成に失敗しました。",
    500,
    fallback?.code ?? "evaluation_failed",
  );
}
