import { z } from "zod";

export const ServerConfigSchema = z.object({
  geminiApiKey: z.string().min(1),
  geminiModel: z.string().default("gemini-3-flash-preview"),
  judgeTemperature: z.number().min(0).max(2).default(0.2),
  port: z.number().int().positive().default(3000),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export function loadConfig(): ServerConfig {
  return ServerConfigSchema.parse({
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || undefined,
    judgeTemperature: Number(process.env.JUDGE_TEMPERATURE) || undefined,
    port: Number(process.env.SERVER_PORT) || undefined,
  });
}
