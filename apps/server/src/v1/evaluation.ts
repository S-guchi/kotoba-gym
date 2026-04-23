import {
  AttemptEvaluationSchema,
  type PreviousEvaluationPayload,
  type ThemeRecord,
} from "@kotoba-gym/core";
import type { ServerConfig } from "../config.js";
import { createLLMClient } from "../lib/gemini-client.js";
import { ApiError } from "./api-error.js";
import {
  EVALUATION_RESPONSE_SCHEMA,
  buildEvaluationPrompt,
  inferApiError,
  normalizeScores,
  withDeterministicComparison,
} from "./evaluation-helpers.js";

export { ApiError } from "./api-error.js";

function logGeminiEvaluation(params: {
  themeId: string;
  mimeType: string;
  raw: string;
}) {
  console.log(
    `[gemini][evaluation] themeId=${params.themeId} mimeType=${params.mimeType}`,
  );
  console.log(params.raw);
}

export async function evaluateAttempt(params: {
  config: ServerConfig;
  theme: ThemeRecord;
  audio: Uint8Array;
  mimeType: string;
  locale: string;
  previousEvaluationSummary?: string;
  previousEvaluation?: PreviousEvaluationPayload;
}) {
  try {
    const client = createLLMClient(
      params.config.geminiApiKey,
      params.config.geminiModel,
    );
    const raw = await client.generateParts(
      [
        {
          text: buildEvaluationPrompt({
            theme: params.theme,
            locale: params.locale,
            previousEvaluationSummary: params.previousEvaluationSummary,
            previousEvaluation: params.previousEvaluation,
          }),
        },
        {
          inlineData: {
            mimeType: params.mimeType,
            data: toBase64(params.audio),
          },
        },
      ],
      {
        responseSchema: EVALUATION_RESPONSE_SCHEMA,
        temperature: 0.4,
        thinkingLevel: "low",
      },
    );
    logGeminiEvaluation({
      themeId: params.theme.id,
      mimeType: params.mimeType,
      raw,
    });

    const parsed = AttemptEvaluationSchema.parse(JSON.parse(raw));
    const normalized = {
      ...parsed,
      scores: normalizeScores(parsed.scores),
    };

    return withDeterministicComparison({
      raw: normalized,
      previousEvaluation: params.previousEvaluation,
    });
  } catch (error) {
    throw inferApiError(error);
  }
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }

  return btoa(binary);
}
