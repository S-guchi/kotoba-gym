import Constants from "expo-constants";
import type {
  PersonalizationProfile,
  PersonalizedPracticePrompt,
  PracticeSessionRecord,
  AttemptEvaluation,
} from "@kotoba-gym/core";
import {
  buildEvaluationRequestFields,
  createAudioUploadDescriptor,
  type ApiErrorPayload,
  resolveApiBaseUrl,
  toMobileApiErrorData,
} from "./api-helpers";
import { getOwnerKey } from "./device-identity";

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
  session: PracticeSessionRecord;
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

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw await parseApiError(response);
  }
  return (await response.json()) as T;
}

export async function fetchPrompts(): Promise<PersonalizedPracticePrompt[]> {
  const ownerKey = await getOwnerKey();
  const payload = await fetchJson<{ prompts: PersonalizedPracticePrompt[] }>(
    `${API_BASE_URL}/v1/prompts?ownerKey=${encodeURIComponent(ownerKey)}`,
  );
  return payload.prompts;
}

export async function fetchPersonalizationProfile(): Promise<PersonalizationProfile | null> {
  const ownerKey = await getOwnerKey();
  const payload = await fetchJson<{
    profile: PersonalizationProfile | null;
  }>(`${API_BASE_URL}/v1/profile?ownerKey=${encodeURIComponent(ownerKey)}`);
  return payload.profile;
}

export async function savePersonalizationProfile(
  profile: PersonalizationProfile,
): Promise<PersonalizationProfile> {
  const ownerKey = await getOwnerKey();
  const payload = await fetchJson<{ profile: PersonalizationProfile }>(
    `${API_BASE_URL}/v1/profile`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ownerKey, profile }),
    },
  );
  return payload.profile;
}

export async function resetPersonalization(): Promise<void> {
  const ownerKey = await getOwnerKey();
  const response = await fetch(
    `${API_BASE_URL}/v1/personalization?ownerKey=${encodeURIComponent(ownerKey)}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw await parseApiError(response);
  }
}

export async function generatePersonalizedPrompts(
  profile: PersonalizationProfile,
): Promise<PersonalizedPracticePrompt[]> {
  const ownerKey = await getOwnerKey();
  const payload = await fetchJson<{ prompts: PersonalizedPracticePrompt[] }>(
    `${API_BASE_URL}/v1/personalized-prompts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ownerKey, profile }),
    },
  );

  return payload.prompts;
}

export async function createRemotePracticeSession(
  promptId: string,
): Promise<PracticeSessionRecord> {
  const ownerKey = await getOwnerKey();
  const payload = await fetchJson<{ session: PracticeSessionRecord }>(
    `${API_BASE_URL}/v1/sessions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ownerKey, promptId }),
    },
  );

  return payload.session;
}

export async function fetchPracticeSession(
  sessionId: string,
): Promise<PracticeSessionRecord | null> {
  const ownerKey = await getOwnerKey();
  try {
    const payload = await fetchJson<{ session: PracticeSessionRecord }>(
      `${API_BASE_URL}/v1/sessions/${encodeURIComponent(sessionId)}?ownerKey=${encodeURIComponent(ownerKey)}`,
    );
    return payload.session;
  } catch (cause) {
    if (cause instanceof MobileApiError && cause.code === "session_not_found") {
      return null;
    }
    throw cause;
  }
}

export async function fetchPracticeSessions(): Promise<
  PracticeSessionRecord[]
> {
  const ownerKey = await getOwnerKey();
  const payload = await fetchJson<{ sessions: PracticeSessionRecord[] }>(
    `${API_BASE_URL}/v1/sessions?ownerKey=${encodeURIComponent(ownerKey)}`,
  );
  return payload.sessions;
}

export async function submitEvaluation(params: {
  sessionId: string;
  promptId: string;
  attemptNumber: number;
  audioUri: string;
}): Promise<EvaluationResponse> {
  const ownerKey = await getOwnerKey();
  const fields = buildEvaluationRequestFields({
    ownerKey,
    sessionId: params.sessionId,
    promptId: params.promptId,
    attemptNumber: params.attemptNumber,
  });
  const form = new FormData();
  form.append("ownerKey", fields.ownerKey);
  form.append("sessionId", fields.sessionId);
  form.append("promptId", fields.promptId);
  form.append("attemptNumber", fields.attemptNumber);
  form.append("locale", fields.locale);

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
