import { describe, expect, test } from "vitest";
import {
  buildEvaluationRequestFields,
  createAudioUploadDescriptor,
  resolveApiBaseUrl,
  toMobileApiErrorData,
} from "./api-helpers";

describe.each([
  {
    name: "env url wins",
    input: {
      envUrl: "https://api.example.com",
      hostUri: "192.168.0.2:8081",
    },
    expected: "https://api.example.com",
  },
  {
    name: "expo host uri fallback",
    input: {
      envUrl: "",
      hostUri: "192.168.0.2:8081",
    },
    expected: "http://192.168.0.2:8787",
  },
  {
    name: "localhost default",
    input: {},
    expected: "http://127.0.0.1:8787",
  },
])("resolveApiBaseUrl", ({ input, expected }) => {
  test.each([{ label: "base url resolves deterministically" }])(
    "$label",
    () => {
      expect(resolveApiBaseUrl(input)).toBe(expected);
    },
  );
});

describe.each([
  {
    name: "payload is mapped",
    payload: {
      error: {
        message: "再試行してください。",
        code: "retryable_error",
        retryable: true,
      },
    },
    expected: {
      message: "再試行してください。",
      code: "retryable_error",
      retryable: true,
    },
  },
  {
    name: "empty payload falls back",
    payload: undefined,
    expected: {
      message: "通信に失敗しました。",
      code: "unknown_error",
      retryable: false,
    },
  },
])("toMobileApiErrorData", ({ payload, expected }) => {
  test.each([{ label: "api error payload is normalized" }])("$label", () => {
    expect(toMobileApiErrorData(payload)).toEqual(expected);
  });
});

describe.each([
  {
    name: "evaluation payload includes owner and session",
    input: {
      ownerKey: "owner-1",
      sessionId: "session-1",
      themeId: "theme-api-cache",
    },
    expected: {
      ownerKey: "owner-1",
      sessionId: "session-1",
      themeId: "theme-api-cache",
      locale: "ja-JP",
    },
  },
])("buildEvaluationRequestFields", ({ input, expected }) => {
  test.each([{ label: "request fields are serialized correctly" }])(
    "$label",
    () => {
      expect(buildEvaluationRequestFields(input)).toEqual(expected);
    },
  );
});

describe.each([
  {
    name: "audio descriptor is fixed to m4a",
    input: {
      audioUri: "file:///tmp/audio.m4a",
      sessionId: "session-2",
    },
    expected: {
      uri: "file:///tmp/audio.m4a",
      name: "session-2.m4a",
      type: "audio/m4a",
    },
  },
])("createAudioUploadDescriptor", ({ input, expected }) => {
  test.each([{ label: "audio upload descriptor is stable" }])("$label", () => {
    expect(
      createAudioUploadDescriptor(input.audioUri, input.sessionId),
    ).toEqual(expected);
  });
});
