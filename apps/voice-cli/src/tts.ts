import { Readable } from "node:stream";
import { DeepgramClient } from "@deepgram/sdk";

let deepgram: DeepgramClient;
let ttsModel: string;

export function initTts(apiKey: string, model: string): void {
  deepgram = new DeepgramClient({ apiKey });
  ttsModel = model;
}

export async function synthesize(text: string): Promise<Buffer> {
  const result = await deepgram.speak.v1.audio.generate({
    text,
    model: ttsModel,
  });

  const webStream = result.stream();
  if (!webStream) {
    throw new Error("Deepgram TTS returned no stream");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = Readable.fromWeb(webStream as any);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  const audio = Buffer.concat(chunks);
  if (audio.byteLength === 0) {
    throw new Error("Deepgram TTS returned empty audio");
  }
  return audio;
}

/** Warm up the Deepgram connection with a tiny request */
export async function warmup(): Promise<void> {
  try {
    await synthesize("。");
  } catch {
    // ignore warmup failures
  }
}
