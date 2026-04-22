import Constants from "expo-constants";
import type {
  GeneratePersonalizedPromptsResponse,
  PersonalizationProfile,
  PersonalizedPracticePrompt,
  AttemptEvaluation,
  PracticePrompt,
  PreviousAttemptPayload,
} from "@kotoba-gym/core";
import {
  buildEvaluationRequestFields,
  createAudioUploadDescriptor,
  type ApiErrorPayload,
  resolveApiBaseUrl,
  toMobileApiErrorData,
} from "./api-helpers";

export class MobileApiError extends Error {
  constructor(
    message: string,
    readonly code = "unknown_error",
    readonly retryable = false,
  ) {
    super(message);
  }
}

interface EvaluationResponse {
  attemptNumber: number;
  evaluation: AttemptEvaluation;
  prompt: PracticePrompt;
}

type ReactNativeAudioFile = Blob & {
  readonly uri: string;
  readonly name: string;
  readonly type: string;
};

const API_BASE_URL = resolveApiBaseUrl({
  envUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  hostUri: Constants.expoConfig?.hostUri,
});

async function parseApiError(response: Response): Promise<MobileApiError> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    const error = toMobileApiErrorData(payload);
    return new MobileApiError(error.message, error.code, error.retryable);
  } catch {
    const fallback = toMobileApiErrorData();
    return new MobileApiError(
      fallback.message,
      fallback.code,
      fallback.retryable,
    );
  }
}

export async function fetchPrompts(): Promise<PracticePrompt[]> {
  const response = await fetch(`${API_BASE_URL}/v1/prompts`);
  if (!response.ok) {
    throw await parseApiError(response);
  }

  const payload = (await response.json()) as { prompts: PracticePrompt[] };
  return payload.prompts;
}

export async function generatePersonalizedPrompts(
  profile: PersonalizationProfile,
): Promise<PersonalizedPracticePrompt[]> {
  const response = await fetch(`${API_BASE_URL}/v1/personalized-prompts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const payload =
    (await response.json()) as GeneratePersonalizedPromptsResponse;
  return payload.prompts;
}

export async function submitEvaluation(params: {
  promptId: string;
  attemptNumber: number;
  audioUri: string;
  previousAttemptSummary?: string;
  previousEvaluation?: PreviousAttemptPayload;
}): Promise<EvaluationResponse> {
  const fields = buildEvaluationRequestFields({
    promptId: params.promptId,
    attemptNumber: params.attemptNumber,
    previousAttemptSummary: params.previousAttemptSummary,
    previousEvaluation: params.previousEvaluation,
  });
  const form = new FormData();
  form.append("promptId", fields.promptId);
  form.append("attemptNumber", fields.attemptNumber);
  form.append("locale", fields.locale);
  if (fields.previousAttemptSummary) {
    form.append("previousAttemptSummary", fields.previousAttemptSummary);
  }
  if (fields.previousEvaluation) {
    form.append("previousEvaluation", fields.previousEvaluation);
  }

  const audioFile = createAudioUploadDescriptor(
    params.audioUri,
    params.attemptNumber,
  ) as ReactNativeAudioFile;
  console.log("[mobile][evaluation] upload", {
    promptId: params.promptId,
    attemptNumber: params.attemptNumber,
    audioUri: params.audioUri,
    fileName: audioFile.name,
    fileType: audioFile.type,
  });
  form.append("audio", audioFile);

  const response = await fetch(`${API_BASE_URL}/v1/evaluations`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as EvaluationResponse;
}
