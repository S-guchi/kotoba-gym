import type { ServerConfig } from "./config.js";

export interface JsonGenerator {
  generateJson(prompt: string): Promise<unknown>;
}

function stripJsonFences(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function createGeminiGenerator(config: ServerConfig): JsonGenerator {
  return {
    async generateJson(prompt: string) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: [
                    "あなたはKotoba Gymの整理パートナーです。",
                    "採点せず、説教せず、ユーザーの未整理な考えを仮説として整理します。",
                    "勝手に断定せず、違っていたら直せる前提の短い日本語で返します。",
                    "返答は必ずJSONのみです。",
                  ].join("\n"),
                },
              ],
            },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.35,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini request failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Gemini returned empty response");
      }

      return JSON.parse(stripJsonFences(text));
    },
  };
}
