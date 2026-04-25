export interface WorkerBindings {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

export interface ServerConfig {
  geminiApiKey: string;
  geminiModel: string;
}

export function loadConfig(env: Partial<WorkerBindings> = {}): ServerConfig {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required");
  }

  return {
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL || "gemini-3-flash-preview",
  };
}
