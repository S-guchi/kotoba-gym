import {
  AttemptEvaluationSchema,
  type PreviousAttemptPayload,
} from "@kotoba-gym/core";
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
  apiKey: string;
  model: string;
  promptId: string;
  attemptNumber: number;
  audio: Buffer;
  mimeType: string;
  locale: string;
  previousAttemptSummary?: string;
  previousEvaluation?: PreviousAttemptPayload;
}) {
  try {
    const client = createLLMClient(params.apiKey, params.model);
    const raw = await client.generateParts(
      [
        {
          text: buildEvaluationPrompt({
            promptId: params.promptId,
            attemptNumber: params.attemptNumber,
            locale: params.locale,
            previousAttemptSummary: params.previousAttemptSummary,
            previousEvaluation: params.previousEvaluation,
          }),
        },
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.audio.toString("base64"),
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
      promptId: params.promptId,
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
