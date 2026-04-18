import { GoogleGenAI } from "@google/genai";

export interface TtsConfig {
  apiKey: string;
  model: string;
  voiceName: string;
}

export interface TtsResult {
  audio: Buffer;
  mimeType: string;
  timings: {
    firstChunkMs: number;
    totalMs: number;
    chunkCount: number;
    bytes: number;
  };
}

interface WavOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

function parseMimeType(mimeType: string): Partial<WavOptions> {
  const [fileType, ...params] = mimeType.split(";").map((s) => s.trim());
  const [, format] = fileType?.split("/") ?? [];
  const options: Partial<WavOptions> = { numChannels: 1 };
  const normalizedFormat = format?.toLowerCase();

  if (normalizedFormat?.startsWith("l")) {
    const bits = Number.parseInt(normalizedFormat.slice(1), 10);
    if (!Number.isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split("=").map((s) => s.trim());
    if (key === "rate" && value) {
      options.sampleRate = Number.parseInt(value, 10);
    }
    if (key === "channels" && value) {
      options.numChannels = Number.parseInt(value, 10);
    }
  }

  return options;
}

function createWavHeader(dataLength: number, options: WavOptions): Buffer {
  const byteRate =
    (options.sampleRate * options.numChannels * options.bitsPerSample) / 8;
  const blockAlign = (options.numChannels * options.bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(options.numChannels, 22);
  buffer.writeUInt32LE(options.sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(options.bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

function normalizeAudio(
  buffer: Buffer,
  mimeType: string,
): Pick<TtsResult, "audio" | "mimeType"> {
  const parsed = parseMimeType(mimeType);
  const normalizedMimeType = mimeType.toLowerCase();
  if (
    normalizedMimeType.startsWith("audio/l") &&
    parsed.sampleRate &&
    parsed.bitsPerSample
  ) {
    return {
      audio: Buffer.concat([
        createWavHeader(buffer.length, {
          numChannels: parsed.numChannels ?? 1,
          sampleRate: parsed.sampleRate,
          bitsPerSample: parsed.bitsPerSample,
        }),
        buffer,
      ]),
      mimeType: "audio/wav",
    };
  }

  return { audio: buffer, mimeType };
}

export async function synthesizeGeminiSpeech(
  text: string,
  config: TtsConfig,
): Promise<TtsResult> {
  const startedAt = performance.now();
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const response = await ai.models.generateContentStream({
    model: config.model,
    config: {
      responseModalities: ["audio"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: config.voiceName,
          },
        },
      },
    },
    contents: [
      {
        role: "user",
        parts: [{ text }],
      },
    ],
  });

  const chunks: Buffer[] = [];
  let mimeType = "audio/wav";
  let firstChunkMs = 0;

  for await (const chunk of response) {
    const part = chunk.candidates?.[0]?.content?.parts?.[0];
    const inlineData = part?.inlineData;
    if (inlineData?.data) {
      if (firstChunkMs === 0) {
        firstChunkMs = performance.now() - startedAt;
      }
      mimeType = inlineData.mimeType || mimeType;
      chunks.push(Buffer.from(inlineData.data, "base64"));
    }
  }

  if (chunks.length === 0) {
    throw new Error("TTS returned empty audio");
  }

  const normalized = normalizeAudio(Buffer.concat(chunks), mimeType);

  return {
    ...normalized,
    timings: {
      firstChunkMs,
      totalMs: performance.now() - startedAt,
      chunkCount: chunks.length,
      bytes: normalized.audio.byteLength,
    },
  };
}
