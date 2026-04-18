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
import { synthesizeDeepgramSpeech } from "./tts/deepgram.js";
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

function sec(valueMs: number): string {
  const seconds = valueMs / 1000;
  if (seconds < 10) {
    return `${seconds.toFixed(1)}s`;
  }
  return `${Math.round(seconds)}s`;
}

function logAi(label: string, fields: Record<string, unknown>): void {
  const details = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");

  console.log(`[ai] ${label}${details ? ` ${details}` : ""}`);
}

function logAiText(label: string, text: string): void {
  console.log(`[ai] ${label}:`);
  console.log(text.trim() || "(empty)");
}

function requireDeepgramApiKey(): string {
  if (!config.deepgramApiKey) {
    throw new Error("DEEPGRAM_API_KEY is required when TTS_PROVIDER=deepgram");
  }
  return config.deepgramApiKey;
}

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
  const requestStartedAt = performance.now();
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
  const requestId = crypto.randomUUID();
  logAi("reply_received", {
    audioBytes: bytes.byteLength,
    mimeType: audio.type || "audio/webm",
    parse: sec(performance.now() - requestStartedAt),
  });

  const turn = session.startAudioTurn({
    audio: bytes,
    mimeType: audio.type || "audio/webm",
    transcriptHint:
      typeof transcriptHint === "string" ? transcriptHint : undefined,
    onTiming: (event) => {
      if (event.type === "judge_result") {
        logAiText("judge transcript", event.transcript);
        logAi("judge result", {
          updates: event.updates,
          observations: event.observations.length,
        });
        for (const observation of event.observations) {
          logAi("judge observation", {
            type: observation.type,
            context: observation.context,
            note: observation.note,
          });
        }
        return;
      }

      logAi(event.type, {
        elapsed: sec(event.elapsedMs),
        chars: "chars" in event ? event.chars : undefined,
      });
    },
  });

  return streamSSE(c, async (stream) => {
    try {
      let tokenCount = 0;
      for await (const token of turn.replyStream) {
        tokenCount++;
        await stream.writeSSE({
          event: "message",
          data: JSON.stringify({ type: "token", text: token }),
        });
      }

      const result = await turn.done;
      logAiText("persona reply", result.reply);
      logAi("reply_done", {
        total: sec(performance.now() - requestStartedAt),
        events: tokenCount,
        replyChars: result.reply.length,
        observations: result.acousticObservations.length,
        isEnded: result.isEnded,
      });
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
      logAi("reply_error", {
        total: sec(performance.now() - requestStartedAt),
        message,
      });
      await stream.writeSSE({
        event: "message",
        data: JSON.stringify({ type: "error", message }),
      });
    }
  });
});

app.post("/tts", async (c) => {
  const requestStartedAt = performance.now();
  const requestBody = TtsRequestSchema.parse(await c.req.json());
  logAiText("tts text", requestBody.text);
  logAi("tts_received", {
    chars: requestBody.text.length,
    provider: config.ttsProvider,
    model:
      config.ttsProvider === "deepgram"
        ? config.deepgramTtsModel
        : config.geminiTtsModel,
    voice: config.ttsProvider === "gemini" ? config.geminiTtsVoice : undefined,
  });

  const result =
    config.ttsProvider === "deepgram"
      ? await synthesizeDeepgramSpeech(requestBody.text, {
          apiKey: requireDeepgramApiKey(),
          model: config.deepgramTtsModel,
        })
      : await synthesizeGeminiSpeech(requestBody.text, {
          apiKey: config.geminiApiKey,
          model: config.geminiTtsModel,
          voiceName: config.geminiTtsVoice,
        });
  logAi("tts_done", {
    provider: config.ttsProvider,
    firstChunk: sec(result.timings.firstChunkMs),
    upstream: sec(result.timings.totalMs),
    total: sec(performance.now() - requestStartedAt),
    chunks: result.timings.chunkCount,
    bytes: result.timings.bytes,
    mimeType: result.mimeType,
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
