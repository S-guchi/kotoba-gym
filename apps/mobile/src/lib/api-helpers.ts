import type { PreviousAttemptPayload } from "../shared/practice";

export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
  };
}

export interface MobileApiErrorData {
  code: string;
  message: string;
  retryable: boolean;
}

export function resolveApiBaseUrl(params: {
  envUrl?: string | null;
  hostUri?: string | null;
}): string {
  const envUrl = params.envUrl?.trim();
  if (envUrl) {
    return envUrl;
  }

  const hostUri = params.hostUri?.trim();
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3000`;
  }

  return "http://127.0.0.1:3000";
}

export function toMobileApiErrorData(
  payload?: ApiErrorPayload | null,
): MobileApiErrorData {
  return {
    message: payload?.error?.message ?? "通信に失敗しました。",
    code: payload?.error?.code ?? "unknown_error",
    retryable: payload?.error?.retryable ?? false,
  };
}

export function buildEvaluationRequestFields(params: {
  promptId: string;
  attemptNumber: number;
  locale?: string;
  previousAttemptSummary?: string;
  previousEvaluation?: PreviousAttemptPayload;
}) {
  return {
    promptId: params.promptId,
    attemptNumber: String(params.attemptNumber),
    locale: params.locale ?? "ja-JP",
    previousAttemptSummary: params.previousAttemptSummary,
    previousEvaluation: params.previousEvaluation
      ? JSON.stringify(params.previousEvaluation)
      : undefined,
  };
}

export function createAudioUploadDescriptor(
  audioUri: string,
  attemptNumber: number,
) {
  return {
    uri: audioUri,
    name: `attempt-${attemptNumber}.m4a`,
    type: "audio/m4a",
  };
}
