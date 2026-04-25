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
    return `http://${host}:8787`;
  }

  return "http://127.0.0.1:8787";
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
  ownerKey: string;
  sessionId: string;
  themeId: string;
  locale?: string;
}) {
  return {
    ownerKey: params.ownerKey,
    sessionId: params.sessionId,
    themeId: params.themeId,
    locale: params.locale ?? "ja-JP",
  };
}

export function createAudioUploadDescriptor(
  audioUri: string,
  sessionId: string,
) {
  return {
    uri: audioUri,
    name: `${sessionId}.m4a`,
    type: "audio/m4a",
  };
}
