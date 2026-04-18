import * as fs from "node:fs";
import * as path from "node:path";
import { serve } from "@hono/node-server";
import { config as loadDotenv } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { SessionStore } from "./sessions.js";
import { synthesizeGeminiSpeech } from "./tts/gemini.js";

for (const envPath of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
]) {
  if (fs.existsSync(envPath)) {
    loadDotenv({ path: envPath, override: false });
  }
}

const config = loadConfig();
const store = new SessionStore(config);
const app = new Hono();

const SessionRequestSchema = z.object({
  topicId: z.string().default("ci-improvement"),
});

const FinalizeRequestSchema = z.object({
  sessionId: z.string(),
});

const TtsRequestSchema = z.object({
  text: z.string().min(1),
});

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

app.get("/topics", (c) => c.json({ topics: store.topics() }));

app.post("/session", async (c) => {
  const body = SessionRequestSchema.parse(await c.req.json().catch(() => ({})));
  const created = await store.create(body.topicId);
  return c.json(created);
});

app.post("/reply", async (c) => {
  const form = await c.req.formData();
  const sessionId = form.get("sessionId");
  const transcriptHint = form.get("transcriptHint");
  const audio = form.get("audio");

  if (typeof sessionId !== "string") {
    return jsonError("sessionId is required");
  }
  if (!(audio instanceof File)) {
    return jsonError("audio file is required");
  }

  const session = store.get(sessionId);
  const bytes = Buffer.from(await audio.arrayBuffer());
  const turn = session.startAudioTurn({
    audio: bytes,
    mimeType: audio.type || "audio/webm",
    transcriptHint:
      typeof transcriptHint === "string" ? transcriptHint : undefined,
  });

  return streamSSE(c, async (stream) => {
    try {
      for await (const token of turn.replyStream) {
        await stream.writeSSE({
          event: "message",
          data: JSON.stringify({ type: "token", text: token }),
        });
      }

      const result = await turn.done;
      await stream.writeSSE({
        event: "message",
        data: JSON.stringify({
          type: "done",
          transcript: result.transcript,
          checklist: result.checklist,
          acousticObservations: result.acousticObservations,
          isEnded: result.isEnded,
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await stream.writeSSE({
        event: "message",
        data: JSON.stringify({ type: "error", message }),
      });
    }
  });
});

app.post("/tts", async (c) => {
  const requestBody = TtsRequestSchema.parse(await c.req.json());
  const result = await synthesizeGeminiSpeech(requestBody.text, {
    apiKey: config.geminiApiKey,
    model: config.geminiTtsModel,
    voiceName: config.geminiTtsVoice,
  });

  const audioBody = result.audio.buffer.slice(
    result.audio.byteOffset,
    result.audio.byteOffset + result.audio.byteLength,
  ) as ArrayBuffer;

  return new Response(audioBody, {
    headers: {
      "content-type": result.mimeType,
      "cache-control": "no-store",
    },
  });
});

app.post("/finalize", async (c) => {
  const body = FinalizeRequestSchema.parse(await c.req.json());
  const session = store.get(body.sessionId);
  const feedback = await session.finalize();
  return c.json({ feedback, snapshot: session.toJSON() });
});

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`kotoba-gym server listening on http://localhost:${info.port}`);
  },
);
