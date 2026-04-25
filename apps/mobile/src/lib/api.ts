import type {
  ConclusionCandidate,
  ConclusionsRequest,
  ConclusionsResponse,
  CreateSessionRequest,
  FeedbackRequest,
  FeedbackResponse,
  GeneratedScript,
  OrganizeRequest,
  OrganizeResponse,
  ScriptRequest,
  ScriptResponse,
  SessionRecord,
  SpeechPlanRequest,
  SpeechPlanResponse,
  UpdateSessionRequest,
} from "@kotoba-gym/core";

const baseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8787";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      body?.error?.message ?? "通信に失敗しました",
      response.status,
      body?.error?.code ?? "request_failed",
    );
  }

  return body as T;
}

export async function createSession(input: CreateSessionRequest) {
  const response = await request<{ session: SessionRecord }>("/v1/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.session;
}

export async function updateSession(
  sessionId: string,
  input: UpdateSessionRequest,
) {
  const response = await request<{ session: SessionRecord }>(
    `/v1/sessions/${sessionId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return response.session;
}

export async function fetchSession(sessionId: string, ownerKey: string) {
  const response = await request<{ session: SessionRecord }>(
    `/v1/sessions/${sessionId}?ownerKey=${encodeURIComponent(ownerKey)}`,
  );
  return response.session;
}

export async function fetchSessions(ownerKey: string) {
  const response = await request<{ sessions: SessionRecord[] }>(
    `/v1/sessions?ownerKey=${encodeURIComponent(ownerKey)}`,
  );
  return response.sessions;
}

export async function organize(input: OrganizeRequest) {
  return request<OrganizeResponse>("/v1/organize", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function generateConclusions(input: ConclusionsRequest) {
  return request<ConclusionsResponse>("/v1/conclusions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function generateSpeechPlan(input: SpeechPlanRequest) {
  return request<SpeechPlanResponse>("/v1/speech-plan", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function generateScript(input: ScriptRequest) {
  return request<ScriptResponse>("/v1/script", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function generateFeedback(input: FeedbackRequest) {
  return request<FeedbackResponse>("/v1/feedback", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type SelectionPayload = {
  selectedConclusion: ConclusionCandidate;
};

export type ScriptPayload = {
  script: GeneratedScript;
};
