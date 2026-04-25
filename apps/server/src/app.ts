import {
  ConclusionsRequestSchema,
  ConclusionsResponseSchema,
  CreateSessionRequestSchema,
  FeedbackRequestSchema,
  FeedbackResponseSchema,
  OrganizeRequestSchema,
  OrganizeResponseSchema,
  ScriptRequestSchema,
  ScriptResponseSchema,
  SpeechPlanRequestSchema,
  SpeechPlanResponseSchema,
  TranscribeAudioRequestSchema,
  TranscribeAudioResponseSchema,
  UpdateSessionRequestSchema,
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
  buildConclusionsPrompt,
  buildFeedbackPrompt,
  buildOrganizePrompt,
  buildScriptPrompt,
  buildSpeechPlanPrompt,
  buildTranscribePrompt,
} from "./prompts.js";
import { D1SessionRepository, type SessionRepository } from "./repository.js";

type AppVariables = {
  repository: SessionRepository;
};

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
  repository?: SessionRepository;
}) {
  const app = new Hono<{ Bindings: WorkerBindings; Variables: AppVariables }>();

  function getGenerator(
    c: Context<{ Bindings: WorkerBindings; Variables: AppVariables }>,
  ) {
    return (
      deps?.generator ??
      createGeminiGenerator(deps?.config ?? loadConfig(c.env))
    );
  }

  app.use(
    "*",
    cors({ origin: "*", allowMethods: ["GET", "POST", "PUT", "OPTIONS"] }),
  );

  app.use("*", async (c, next) => {
    c.set("repository", deps?.repository ?? new D1SessionRepository(c.env.DB));
    await next();
  });

  app.onError((error, c) => {
    console.error(error);
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

  app.post("/v1/organize", async (c) => {
    const parsed = await parseBody(c, OrganizeRequestSchema);
    if (!parsed.success) {
      return jsonError(c, 400, "invalid_request", "入力内容を確認してください");
    }

    const generated = await getGenerator(c).generateJson(
      buildOrganizePrompt(parsed.data),
    );
    return c.json(OrganizeResponseSchema.parse(generated));
  });

  app.post("/v1/conclusions", async (c) => {
    const parsed = await parseBody(c, ConclusionsRequestSchema);
    if (!parsed.success) {
      return jsonError(c, 400, "invalid_request", "入力内容を確認してください");
    }

    const generated = await getGenerator(c).generateJson(
      buildConclusionsPrompt(parsed.data),
    );
    return c.json(ConclusionsResponseSchema.parse(generated));
  });

  app.post("/v1/speech-plan", async (c) => {
    const parsed = await parseBody(c, SpeechPlanRequestSchema);
    if (!parsed.success) {
      return jsonError(c, 400, "invalid_request", "入力内容を確認してください");
    }

    const generated = await getGenerator(c).generateJson(
      buildSpeechPlanPrompt(parsed.data),
    );
    return c.json(SpeechPlanResponseSchema.parse(generated));
  });

  app.post("/v1/script", async (c) => {
    const parsed = await parseBody(c, ScriptRequestSchema);
    if (!parsed.success) {
      return jsonError(c, 400, "invalid_request", "入力内容を確認してください");
    }

    const generated = await getGenerator(c).generateJson(
      buildScriptPrompt(parsed.data),
    );
    return c.json(ScriptResponseSchema.parse(generated));
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

  app.post("/v1/sessions", async (c) => {
    const parsed = await parseBody(c, CreateSessionRequestSchema);
    if (!parsed.success) {
      return jsonError(c, 400, "invalid_request", "入力内容を確認してください");
    }

    const session = await c.get("repository").create(parsed.data);
    return c.json({ session }, 201);
  });

  app.get("/v1/sessions", async (c) => {
    const ownerKey = c.req.query("ownerKey");
    if (!ownerKey) {
      return jsonError(c, 400, "missing_owner_key", "ownerKey が必要です");
    }

    const sessions = await c.get("repository").list(ownerKey);
    return c.json({ sessions });
  });

  app.get("/v1/sessions/:sessionId", async (c) => {
    const ownerKey = c.req.query("ownerKey");
    if (!ownerKey) {
      return jsonError(c, 400, "missing_owner_key", "ownerKey が必要です");
    }

    const session = await c
      .get("repository")
      .get(c.req.param("sessionId"), ownerKey);
    if (!session) {
      return jsonError(c, 404, "session_not_found", "整理が見つかりません");
    }
    return c.json({ session });
  });

  app.put("/v1/sessions/:sessionId", async (c) => {
    const parsed = await parseBody(c, UpdateSessionRequestSchema);
    if (!parsed.success) {
      return jsonError(c, 400, "invalid_request", "入力内容を確認してください");
    }

    const session = await c
      .get("repository")
      .update(c.req.param("sessionId"), parsed.data);
    if (!session) {
      return jsonError(c, 404, "session_not_found", "整理が見つかりません");
    }
    return c.json({ session });
  });

  return app;
}
