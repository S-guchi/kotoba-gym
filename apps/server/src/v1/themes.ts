import type { CreateThemeRequest } from "@kotoba-gym/core";
import { createLLMClient } from "../lib/gemini-client.js";
import {
  CREATE_THEME_RESPONSE_SCHEMA,
  CreateThemeDraftResponseSchema,
  buildCreateThemePrompt,
  inferThemeApiError,
  normalizeGeneratedTheme,
} from "./themes-helpers.js";

function logGeminiTheme(raw: string) {
  console.log("[gemini][theme]");
  console.log(raw);
}

export async function generateTheme(params: {
  apiKey: string;
  model: string;
  input: CreateThemeRequest;
}) {
  try {
    const client = createLLMClient(params.apiKey, params.model);
    const raw = await client.generate(buildCreateThemePrompt(params.input), {
      responseSchema: CREATE_THEME_RESPONSE_SCHEMA,
      temperature: 0.6,
      thinkingLevel: "low",
    });

    logGeminiTheme(raw);
    const parsed = CreateThemeDraftResponseSchema.parse(JSON.parse(raw));
    return normalizeGeneratedTheme({
      input: params.input,
      rawTheme: parsed.theme,
      now: new Date().toISOString(),
    });
  } catch (error) {
    throw inferThemeApiError(error);
  }
}
