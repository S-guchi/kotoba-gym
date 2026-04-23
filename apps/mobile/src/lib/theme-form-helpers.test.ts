import { describe, expect, test } from "vitest";
import { toCreateThemeRequest, validateThemeForm } from "./theme-form-helpers";

describe.each([
  {
    name: "valid state passes",
    input: {
      theme: "API キャッシュ戦略を見直した理由",
      audience: "新メンバー",
      goal: "設計意図を誤解なく理解してほしい",
    },
    expected: {
      isValid: true,
      errors: {
        theme: undefined,
        audience: undefined,
        goal: undefined,
      },
    },
  },
  {
    name: "missing fields are rejected",
    input: {
      theme: " ",
      audience: "",
      goal: "",
    },
    expected: {
      isValid: false,
      errors: {
        theme: "テーマを入力してください。",
        audience: "相手を入力してください。",
        goal: "目的を入力してください。",
      },
    },
  },
])("validateThemeForm", ({ input, expected }) => {
  test.each([{ label: "theme form validation is deterministic" }])(
    "$label",
    () => {
      expect(validateThemeForm(input)).toEqual(expected);
    },
  );
});

describe.each([
  {
    name: "request trims whitespace",
    input: {
      theme: " API キャッシュ ",
      audience: " 新メンバー ",
      goal: " 理解してほしい ",
    },
    expected: {
      theme: "API キャッシュ",
      audience: "新メンバー",
      goal: "理解してほしい",
    },
  },
])("toCreateThemeRequest", ({ input, expected }) => {
  test.each([{ label: "request payload is normalized" }])("$label", () => {
    expect(toCreateThemeRequest(input)).toEqual(expected);
  });
});
