import type {
  FeedbackRequest,
  FeedbackResponse,
  OrganizePackageRequest,
  OrganizePackageResponse,
  TranscribeAudioRequest,
  TranscribeAudioResponse,
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

export async function organizePackage(input: OrganizePackageRequest) {
  return request<OrganizePackageResponse>("/v1/organize-package", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function transcribeAudio(input: TranscribeAudioRequest) {
  return request<TranscribeAudioResponse>("/v1/transcribe", {
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
