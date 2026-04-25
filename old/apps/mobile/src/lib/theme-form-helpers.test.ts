import { describe, expect, test } from "vitest";
import {
  toCreateThemeRequest,
  validateGoalStep,
  validatePersonaStep,
  validateThemeForm,
  validateThemeStep,
} from "./theme-form-helpers";

describe.each([
  {
    name: "valid state passes",
    input: {
      theme: "API キャッシュ戦略を見直した理由",
      personaId: "persona-new-member",
      goal: "設計意図を誤解なく理解してほしい",
    },
    expected: {
      isValid: true,
      errors: {
        theme: undefined,
        personaId: undefined,
        goal: undefined,
      },
    },
  },
  {
    name: "missing fields are rejected",
    input: {
      theme: " ",
      personaId: "",
      goal: "",
    },
    expected: {
      isValid: false,
      errors: {
        theme: "テーマを入力してください。",
        personaId: "相手を入力してください。",
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
    name: "theme step validates content",
    input: " API キャッシュ戦略 ",
    expected: {
      isValid: true,
      errors: {
        theme: undefined,
      },
    },
  },
  {
    name: "theme step rejects empty input",
    input: " ",
    expected: {
      isValid: false,
      errors: {
        theme: "テーマを入力してください。",
      },
    },
  },
])("validateThemeStep", ({ input, expected }) => {
  test.each([{ label: "theme step validation is deterministic" }])(
    "$label",
    () => {
      expect(validateThemeStep(input)).toEqual(expected);
    },
  );
});

describe.each([
  {
    name: "persona step validates selection",
    input: "persona-manager",
    expected: {
      isValid: true,
      errors: {
        personaId: undefined,
      },
    },
  },
  {
    name: "persona step rejects empty selection",
    input: "",
    expected: {
      isValid: false,
      errors: {
        personaId: "相手を入力してください。",
      },
    },
  },
])("validatePersonaStep", ({ input, expected }) => {
  test.each([{ label: "persona step validation is deterministic" }])(
    "$label",
    () => {
      expect(validatePersonaStep(input)).toEqual(expected);
    },
  );
});

describe.each([
  {
    name: "goal step validates content",
    input: "理解してほしい",
    expected: {
      isValid: true,
      errors: {
        goal: undefined,
      },
    },
  },
  {
    name: "goal step rejects empty input",
    input: "",
    expected: {
      isValid: false,
      errors: {
        goal: "目的を入力してください。",
      },
    },
  },
])("validateGoalStep", ({ input, expected }) => {
  test.each([{ label: "goal step validation is deterministic" }])(
    "$label",
    () => {
      expect(validateGoalStep(input)).toEqual(expected);
    },
  );
});

describe.each([
  {
    name: "request trims whitespace",
    input: {
      theme: " API キャッシュ ",
      personaId: " persona-new-member ",
      goal: " 理解してほしい ",
    },
    expected: {
      theme: "API キャッシュ",
      personaId: "persona-new-member",
      goal: "理解してほしい",
    },
  },
])("toCreateThemeRequest", ({ input, expected }) => {
  test.each([{ label: "request payload is normalized" }])("$label", () => {
    expect(toCreateThemeRequest(input)).toEqual(expected);
  });
});
