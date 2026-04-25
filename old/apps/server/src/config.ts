import { z } from "zod";

export const ServerConfigSchema = z.object({
  geminiApiKey: z.string().min(1),
  geminiModel: z.string().default("gemini-3-flash-preview"),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

const ConfigFieldToEnvName = {
  geminiApiKey: "GEMINI_API_KEY",
  geminiModel: "GEMINI_MODEL",
} as const;

export interface WorkerBindings {
  DB: D1Database;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

export function loadConfig(env: {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}): ServerConfig {
  const result = ServerConfigSchema.safeParse({
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL || undefined,
  });

  if (result.success) {
    return result.data;
  }

  const invalidEnvNames = new Set<string>();

  for (const issue of result.error.issues) {
    const fieldName = issue.path[0];

    if (typeof fieldName !== "string") {
      continue;
    }

    const envName =
      ConfigFieldToEnvName[fieldName as keyof typeof ConfigFieldToEnvName];

    if (!envName) {
      continue;
    }

    if (issue.code === "invalid_type" || issue.code === "too_small") {
      invalidEnvNames.add(envName);
    }
  }

  if (invalidEnvNames.size > 0) {
    throw new Error(
      `サーバー設定が不足しています: ${Array.from(invalidEnvNames).join(", ")}。apps/server/.dev.vars を確認してください。`,
    );
  }

  throw result.error;
}
