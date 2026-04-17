import { GoogleGenAI, type Type } from "@google/genai";

export interface GenerateOptions {
  temperature?: number;
  systemPrompt?: string;
  responseSchema?: Record<string, unknown>;
  responseType?: Type;
}

export interface LLMClient {
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
}

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split("\n");
    lines.shift();
    if (lines.at(-1)?.trim() === "```") {
      lines.pop();
    }
    return lines.join("\n").trim();
  }
  return trimmed;
}

export function createLLMClient(apiKey: string, model: string): LLMClient {
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generate(prompt: string, options: GenerateOptions = {}) {
      const config: Record<string, unknown> = {};

      if (options.temperature !== undefined) {
        config.temperature = options.temperature;
      }

      if (options.systemPrompt) {
        config.systemInstruction = options.systemPrompt;
      }

      if (options.responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = options.responseSchema;
      }

      const response = await ai.models.generateContent({
        model,
        config,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      const text = response.text;
      if (!text) {
        throw new Error("LLM returned empty response");
      }

      return options.responseSchema ? stripMarkdownFences(text) : text;
    },
  };
}
