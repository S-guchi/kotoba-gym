import { describe, expect, test } from "vitest";
import { ApiError } from "./api-error.js";
import {
  assertSupportedAudioMimeType,
  parseEvaluationFields,
  parseOwnerKey,
  parseProfilePayload,
  resolveAudioMimeType,
  toRouteApiError,
} from "./route-helpers.js";

function createFormData(values: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    form.append(key, value);
  }
  return form;
}

describe.each([
  {
    name: "mime alias is normalized",
    file: { name: "voice.bin", type: "audio/mp4a-latm" },
    expected: "audio/m4a",
  },
  {
    name: "extension fallback resolves mp3",
    file: { name: "voice.mp3", type: "application/octet-stream" },
    expected: "audio/mpeg",
  },
  {
    name: "unknown file falls back to m4a",
    file: { name: "voice.unknown", type: "" },
    expected: "audio/m4a",
  },
])("resolveAudioMimeType", ({ file, expected }) => {
  test.each([{ label: "mime is inferred deterministically" }])("$label", () => {
    expect(resolveAudioMimeType(file)).toBe(expected);
  });
});

describe.each([
  {
    name: "valid fields keep explicit values",
    form: createFormData({
      ownerKey: "owner-1",
      sessionId: "session-1",
      promptId: "tech-api-cache",
      attemptNumber: "2",
      locale: "en-US",
    }),
    expected: {
      ownerKey: "owner-1",
      sessionId: "session-1",
      promptId: "tech-api-cache",
      attemptNumber: 2,
      locale: "en-US",
    },
  },
  {
    name: "defaults are filled",
    form: createFormData({
      ownerKey: "owner-1",
      sessionId: "session-1",
      promptId: "tech-api-cache",
    }),
    expected: {
      ownerKey: "owner-1",
      sessionId: "session-1",
      promptId: "tech-api-cache",
      attemptNumber: 1,
      locale: "ja-JP",
    },
  },
])("parseEvaluationFields", ({ form, expected }) => {
  test.each([{ label: "fields are parsed with defaults" }])("$label", () => {
    expect(parseEvaluationFields(form)).toEqual(expected);
  });
});

describe.each([
  {
    name: "owner key is trimmed",
    raw: " owner-1 ",
    expected: "owner-1",
  },
])("parseOwnerKey", ({ raw, expected }) => {
  test.each([{ label: "owner key parsing is stable" }])("$label", () => {
    expect(parseOwnerKey(raw)).toBe(expected);
  });
});

describe.each([
  {
    name: "profile payload is parsed",
    raw: {
      ownerKey: "owner-1",
      profile: {
        role: "モバイル",
        roleText: "",
        strengths: ["実装速度"],
        strengthsText: "",
        techStack: ["Expo"],
        techStackText: "",
        scenarios: ["技術説明"],
      },
    },
    expectedOwnerKey: "owner-1",
  },
])("parseProfilePayload", ({ raw, expectedOwnerKey }) => {
  test.each([{ label: "profile payload is validated" }])("$label", () => {
    expect(parseProfilePayload(raw).ownerKey).toBe(expectedOwnerKey);
  });
});

describe.each([
  {
    name: "supported mime passes through",
    mimeType: "audio/m4a",
    expected: "audio/m4a",
  },
])("assertSupportedAudioMimeType", ({ mimeType, expected }) => {
  test.each([{ label: "supported mime is accepted" }])("$label", () => {
    expect(assertSupportedAudioMimeType(mimeType)).toBe(expected);
  });
});

describe.each([
  {
    name: "unsupported mime is rejected",
    mimeType: "image/png",
  },
])("assertSupportedAudioMimeType errors", ({ mimeType }) => {
  test.each([{ label: "unsupported mime throws api error" }])("$label", () => {
    expect(() => assertSupportedAudioMimeType(mimeType)).toThrowError(ApiError);
  });
});

describe.each([
  {
    name: "explicit api error is preserved",
    error: new ApiError("bad request", 400, "bad_request"),
    expected: { status: 400, code: "bad_request" },
  },
  {
    name: "generic error becomes evaluation failed",
    error: new Error("boom"),
    fallback: undefined,
    expected: { status: 500, code: "evaluation_failed" },
  },
  {
    name: "generic error can use custom fallback",
    error: new Error("boom"),
    fallback: {
      message: "個人化お題の生成に失敗しました。",
      code: "personalized_prompt_generation_failed",
    },
    expected: {
      status: 500,
      code: "personalized_prompt_generation_failed",
    },
  },
])("toRouteApiError", ({ error, expected, fallback }) => {
  test.each([{ label: "route error is normalized" }])("$label", () => {
    const apiError = toRouteApiError(error, fallback);
    expect({ status: apiError.status, code: apiError.code }).toEqual(expected);
  });
});
