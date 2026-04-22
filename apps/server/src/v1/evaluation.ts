import {
  AttemptEvaluationSchema,
  type PracticePrompt,
  type PreviousAttemptPayload,
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
  promptId: string;
  attemptNumber: number;
  mimeType: string;
  raw: string;
}) {
  console.log(
    `[gemini][evaluation] promptId=${params.promptId} attempt=${params.attemptNumber} mimeType=${params.mimeType}`,
  );
  console.log(params.raw);
}

export async function evaluateAttempt(params: {
  config: ServerConfig;
  prompt: PracticePrompt;
  attemptNumber: number;
  audio: Uint8Array;
  mimeType: string;
  locale: string;
  previousAttemptSummary?: string;
  previousEvaluation?: PreviousAttemptPayload;
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
            prompt: params.prompt,
            attemptNumber: params.attemptNumber,
            locale: params.locale,
            previousAttemptSummary: params.previousAttemptSummary,
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
      promptId: params.prompt.id,
      attemptNumber: params.attemptNumber,
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
