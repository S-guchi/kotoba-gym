import { z } from "zod";

export const ServerConfigSchema = z.object({
  geminiApiKey: z.string().min(1),
  geminiModel: z.string().default("gemini-3-flash-preview"),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export interface WorkerBindings {
  DB: D1Database;
  GEMINI_API_KEY: string;
  GEMINI_MODEL?: string;
}

export function loadConfig(env: {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}): ServerConfig {
  return ServerConfigSchema.parse({
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL || undefined,
  });
}
