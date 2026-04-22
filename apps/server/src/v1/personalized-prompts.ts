import { createLLMClient } from "../lib/gemini-client.js";
import {
  PERSONALIZED_PROMPTS_RESPONSE_SCHEMA,
  PersonalizedPromptDraftResponseSchema,
  buildPersonalizedPromptsPrompt,
  inferPersonalizedPromptApiError,
  normalizePersonalizedPrompts,
} from "./personalized-prompts-helpers.js";

function logGeminiPersonalizedPrompts(raw: string) {
  console.log("[gemini][personalized-prompts]");
  console.log(raw);
}

export async function generatePersonalizedPrompts(params: {
  apiKey: string;
  model: string;
  profile: import("@kotoba-gym/core").PersonalizationProfile;
}) {
  try {
    const client = createLLMClient(params.apiKey, params.model);
    const raw = await client.generate(
      buildPersonalizedPromptsPrompt(params.profile),
      {
        responseSchema: PERSONALIZED_PROMPTS_RESPONSE_SCHEMA,
        temperature: 0.7,
        thinkingLevel: "low",
      },
    );

    logGeminiPersonalizedPrompts(raw);
    const parsed = PersonalizedPromptDraftResponseSchema.parse(JSON.parse(raw));
    return normalizePersonalizedPrompts(parsed.prompts);
  } catch (error) {
    throw inferPersonalizedPromptApiError(error);
  }
}
