export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

export interface WorkerBindings {
  DB: D1DatabaseLike;
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
