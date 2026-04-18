import { DeepgramClient } from "@deepgram/sdk";

export interface DeepgramTtsConfig {
  apiKey: string;
  model: string;
}

export interface DeepgramTtsResult {
  audio: Buffer;
  mimeType: string;
  timings: {
    firstChunkMs: number;
    totalMs: number;
    chunkCount: number;
    bytes: number;
  };
}

export async function synthesizeDeepgramSpeech(
  text: string,
  config: DeepgramTtsConfig,
): Promise<DeepgramTtsResult> {
  const startedAt = performance.now();
  const deepgram = new DeepgramClient({ apiKey: config.apiKey });

  const result = await deepgram.speak.v1.audio.generate({
    text,
    model: config.model,
  });
  const firstChunkMs = performance.now() - startedAt;
  const audio = Buffer.from(await result.arrayBuffer());

  if (audio.byteLength === 0) {
    throw new Error("Deepgram TTS returned empty audio");
  }

  return {
    audio,
    mimeType: "audio/mpeg",
    timings: {
      firstChunkMs,
      totalMs: performance.now() - startedAt,
      chunkCount: 1,
      bytes: audio.byteLength,
    },
  };
}
