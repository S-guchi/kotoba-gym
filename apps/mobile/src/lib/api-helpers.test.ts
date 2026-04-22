import { describe, expect, test } from "vitest";
import type { PreviousAttemptPayload } from "@kotoba-gym/core";
import {
  buildEvaluationRequestFields,
  createAudioUploadDescriptor,
  resolveApiBaseUrl,
  toMobileApiErrorData,
} from "./api-helpers";

const previousEvaluation: PreviousAttemptPayload = {
  attemptNumber: 1,
  transcript: "text",
  summary: "summary",
  scores: [
    { axis: "conclusion", score: 3, comment: "a" },
    { axis: "structure", score: 3, comment: "b" },
    { axis: "specificity", score: 3, comment: "c" },
    { axis: "technicalValidity", score: 3, comment: "d" },
    { axis: "brevity", score: 3, comment: "e" },
  ],
  goodPoints: ["g1", "g2"],
  improvementPoints: ["i1", "i2"],
  nextFocus: "next",
};

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
    expected: "http://192.168.0.2:3000",
  },
  {
    name: "localhost default",
    input: {},
    expected: "http://127.0.0.1:3000",
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
    name: "first attempt payload omits previous fields",
    input: {
      promptId: "tech-api-cache",
      attemptNumber: 1,
    },
    expected: {
      promptId: "tech-api-cache",
      attemptNumber: "1",
      locale: "ja-JP",
      previousAttemptSummary: undefined,
      previousEvaluation: undefined,
    },
  },
  {
    name: "second attempt payload includes serialized previous evaluation",
    input: {
      promptId: "tech-api-cache",
      attemptNumber: 2,
      previousAttemptSummary: "前回は抽象的でした。",
      previousEvaluation,
    },
    expected: {
      promptId: "tech-api-cache",
      attemptNumber: "2",
      locale: "ja-JP",
      previousAttemptSummary: "前回は抽象的でした。",
      previousEvaluation:
        '{"attemptNumber":1,"transcript":"text","summary":"summary","scores":[{"axis":"conclusion","score":3,"comment":"a"},{"axis":"structure","score":3,"comment":"b"},{"axis":"specificity","score":3,"comment":"c"},{"axis":"technicalValidity","score":3,"comment":"d"},{"axis":"brevity","score":3,"comment":"e"}],"goodPoints":["g1","g2"],"improvementPoints":["i1","i2"],"nextFocus":"next"}',
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
      attemptNumber: 2,
    },
    expected: {
      uri: "file:///tmp/audio.m4a",
      name: "attempt-2.m4a",
      type: "audio/m4a",
    },
  },
])("createAudioUploadDescriptor", ({ input, expected }) => {
  test.each([{ label: "audio upload descriptor is stable" }])("$label", () => {
    expect(
      createAudioUploadDescriptor(input.audioUri, input.attemptNumber),
    ).toEqual(expected);
  });
});
