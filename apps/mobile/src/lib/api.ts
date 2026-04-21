import Constants from "expo-constants";
import type {
  AttemptEvaluation,
  PracticePrompt,
  PreviousAttemptPayload,
} from "../shared/practice";

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
  };
}

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

function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3000`;
  }

  return "http://127.0.0.1:3000";
}

const API_BASE_URL = resolveApiBaseUrl();

async function parseApiError(response: Response): Promise<MobileApiError> {
  const fallback = new MobileApiError("通信に失敗しました。");

  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return new MobileApiError(
      payload.error?.message ?? fallback.message,
      payload.error?.code ?? fallback.code,
      payload.error?.retryable ?? false,
    );
  } catch {
    return fallback;
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

export async function submitEvaluation(params: {
  promptId: string;
  attemptNumber: number;
  audioUri: string;
  previousAttemptSummary?: string;
  previousEvaluation?: PreviousAttemptPayload;
}): Promise<EvaluationResponse> {
  const form = new FormData();
  form.append("promptId", params.promptId);
  form.append("attemptNumber", String(params.attemptNumber));
  form.append("locale", "ja-JP");
  if (params.previousAttemptSummary) {
    form.append("previousAttemptSummary", params.previousAttemptSummary);
  }
  if (params.previousEvaluation) {
    form.append("previousEvaluation", JSON.stringify(params.previousEvaluation));
  }

  const audioResponse = await fetch(params.audioUri);
  const audioBlob = await audioResponse.blob();
  form.append("audio", audioBlob, `attempt-${params.attemptNumber}.m4a`);

  const response = await fetch(`${API_BASE_URL}/v1/evaluations`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as EvaluationResponse;
}
