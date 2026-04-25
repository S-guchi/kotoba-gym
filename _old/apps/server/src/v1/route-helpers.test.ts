import { describe, expect, test } from "vitest";
import {
  parseCreateThemePayload,
  parseEvaluationFields,
  parseSessionCreatePayload,
  resolveAudioMimeType,
} from "./route-helpers.js";

describe.each([
  {
    name: "create theme payload parses",
    input: {
      ownerKey: "owner-1",
      input: {
        theme: "障害報告",
        personaId: "persona-manager",
        goal: "判断してほしい",
      },
    },
    expected: {
      ownerKey: "owner-1",
      input: {
        theme: "障害報告",
        personaId: "persona-manager",
        goal: "判断してほしい",
      },
    },
  },
])("parseCreateThemePayload", ({ input, expected }) => {
  test.each([{ label: "theme payload parse succeeds" }])("$label", () => {
    expect(parseCreateThemePayload(input)).toEqual(expected);
  });
});

describe.each([
  {
    name: "session payload parses",
    input: {
      ownerKey: "owner-1",
      themeId: "theme-1",
    },
  },
])("parseSessionCreatePayload", ({ input }) => {
  test.each([{ label: "session payload parse succeeds" }])("$label", () => {
    expect(parseSessionCreatePayload(input)).toEqual(input);
  });
});

describe.each([
  {
    name: "default locale is applied",
    form: () => {
      const form = new FormData();
      form.append("ownerKey", "owner-1");
      form.append("sessionId", "session-1");
      form.append("themeId", "theme-1");
      return form;
    },
    expected: {
      ownerKey: "owner-1",
      sessionId: "session-1",
      themeId: "theme-1",
      locale: "ja-JP",
    },
  },
])("parseEvaluationFields", ({ form, expected }) => {
  test.each([{ label: "evaluation form parse succeeds" }])("$label", () => {
    expect(parseEvaluationFields(form())).toEqual(expected);
  });
});

describe.each([
  {
    name: "prefer explicit mime type",
    file: { name: "session.m4a", type: "audio/x-m4a" },
    expected: "audio/m4a",
  },
  {
    name: "infer from file name",
    file: { name: "session.webm", type: "" },
    expected: "audio/webm",
  },
])("resolveAudioMimeType", ({ file, expected }) => {
  test.each([{ label: "mime type resolution works" }])("$label", () => {
    expect(resolveAudioMimeType(file)).toBe(expected);
  });
});
