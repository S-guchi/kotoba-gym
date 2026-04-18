import { z } from "zod";

export const ServerConfigSchema = z.object({
  geminiApiKey: z.string().min(1),
  geminiModel: z.string().default("gemini-3-flash-preview"),
  maxTurns: z.number().int().positive().default(8),
  judgeTemperature: z.number().min(0).max(2).default(0.2),
  personaTemperature: z.number().min(0).max(2).default(0.7),
  logDir: z.string().default("./logs"),
  port: z.number().int().positive().default(3000),
  ttsProvider: z.enum(["deepgram", "gemini"]).default("deepgram"),
  geminiTtsModel: z.string().default("gemini-3.1-flash-tts-preview"),
  geminiTtsVoice: z.string().default("Zephyr"),
  deepgramApiKey: z.string().optional(),
  deepgramTtsModel: z.string().default("aura-2-izanami-ja"),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export function loadConfig(): ServerConfig {
  return ServerConfigSchema.parse({
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || undefined,
    maxTurns: Number(process.env.MAX_TURNS) || undefined,
    judgeTemperature: Number(process.env.JUDGE_TEMPERATURE) || undefined,
    personaTemperature: Number(process.env.PERSONA_TEMPERATURE) || undefined,
    logDir: process.env.LOG_DIR || undefined,
    port: Number(process.env.SERVER_PORT) || undefined,
    ttsProvider: process.env.TTS_PROVIDER || undefined,
    geminiTtsModel: process.env.GEMINI_TTS_MODEL || undefined,
    geminiTtsVoice: process.env.GEMINI_TTS_VOICE || undefined,
    deepgramApiKey: process.env.DEEPGRAM_API_KEY || undefined,
    deepgramTtsModel: process.env.DEEPGRAM_TTS_MODEL || undefined,
  });
}
