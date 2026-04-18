import { GoogleGenAI, type Part, type Type } from "@google/genai";

export interface GenerateOptions {
  temperature?: number;
  systemPrompt?: string;
  responseSchema?: Record<string, unknown>;
  responseType?: Type;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
}

export interface LLMClient {
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateParts(parts: Part[], options?: GenerateOptions): Promise<string>;
  streamParts(parts: Part[], options?: GenerateOptions): AsyncIterable<string>;
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

  function buildConfig(options: GenerateOptions): Record<string, unknown> {
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

    if (options.thinkingLevel) {
      config.thinkingConfig = { thinkingLevel: options.thinkingLevel };
    }

    return config;
  }

  async function generateParts(
    parts: Part[],
    options: GenerateOptions = {},
  ): Promise<string> {
    const response = await ai.models.generateContent({
      model,
      config: buildConfig(options),
      contents: [
        {
          role: "user",
          parts,
        },
      ],
    });

    const text = response.text;
    if (!text) {
      throw new Error("LLM returned empty response");
    }

    return options.responseSchema ? stripMarkdownFences(text) : text;
  }

  return {
    async generate(prompt: string, options: GenerateOptions = {}) {
      return generateParts([{ text: prompt }], options);
    },

    generateParts,

    async *streamParts(parts: Part[], options: GenerateOptions = {}) {
      const response = await ai.models.generateContentStream({
        model,
        config: buildConfig(options),
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      });

      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    },
  };
}
