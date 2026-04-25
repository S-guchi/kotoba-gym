import {
  FeedbackRequestSchema,
  FeedbackResponseSchema,
  OrganizePackageRequestSchema,
  OrganizePackageResponseSchema,
  TranscribeAudioRequestSchema,
  TranscribeAudioResponseSchema,
} from "@kotoba-gym/core";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  type ServerConfig,
  type WorkerBindings,
  loadConfig,
} from "./config.js";
import { type JsonGenerator, createGeminiGenerator } from "./gemini-client.js";
import {
  buildFeedbackPrompt,
  buildOrganizePackagePrompt,
  buildTranscribePrompt,
} from "./prompts.js";

function jsonError(
  c: Context,
  status: 400 | 404 | 500,
  code: string,
  message: string,
) {
  return c.json({ error: { code, message } }, status);
}

type Schema<T> = {
  safeParse: (
    value: unknown,
  ) => { success: true; data: T } | { success: false };
};

async function parseBody<T>(c: Context, schema: Schema<T>) {
  const body = await c.req.json().catch(() => null);
  return schema.safeParse(body);
}

export function createApp(deps?: {
  config?: ServerConfig;
  generator?: JsonGenerator;
}) {
  const app = new Hono<{ Bindings: WorkerBindings }>();

  function getGenerator(c: Context<{ Bindings: WorkerBindings }>) {
    return (
      deps?.generator ??
      createGeminiGenerator(deps?.config ?? loadConfig(c.env))
    );
  }

  app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

  app.onError((error, c) => {
    if (
      error instanceof Error &&
      error.message === "GEMINI_API_KEY is required"
    ) {
      return c.json(
        {
          error: {
            code: "missing_gemini_api_key",
            message: "GEMINI_API_KEY が設定されていません",
          },
        },
        503,
      );
    }

    console.error(error);
    return c.json(
      { error: { code: "internal_error", message: "処理に失敗しました" } },
      500,
    );
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/v1/transcribe", async (c) => {
    const parsed = await parseBody(c, TranscribeAudioRequestSchema);
    if (!parsed.success) {
      return jsonError(c, 400, "invalid_request", "音声内容を確認してください");
    }

    const generated = await getGenerator(c).generateJsonWithAudio({
      prompt: buildTranscribePrompt(),
      audioBase64: parsed.data.audioBase64,
      mimeType: parsed.data.mimeType,
    });
    return c.json(TranscribeAudioResponseSchema.parse(generated));
  });

  app.post("/v1/organize-package", async (c) => {
    const parsed = await parseBody(c, OrganizePackageRequestSchema);
    if (!parsed.success) {
      return jsonError(c, 400, "invalid_request", "入力内容を確認してください");
    }

    const generated = await getGenerator(c).generateJson(
      buildOrganizePackagePrompt(parsed.data),
    );
    return c.json(OrganizePackageResponseSchema.parse(generated));
  });

  app.post("/v1/feedback", async (c) => {
    const parsed = await parseBody(c, FeedbackRequestSchema);
    if (!parsed.success) {
      return jsonError(c, 400, "invalid_request", "入力内容を確認してください");
    }

    const generated = await getGenerator(c).generateJson(
      buildFeedbackPrompt(parsed.data),
    );
    return c.json(FeedbackResponseSchema.parse(generated));
  });

  return app;
}
