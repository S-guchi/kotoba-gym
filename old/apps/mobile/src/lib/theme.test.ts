import { describe, expect, test } from "vitest";
import { darkPalette, getThemePalette, lightPalette } from "./theme";

describe.each([
  {
    name: "returns light palette for explicit light mode",
    colorScheme: "light" as const,
    expected: lightPalette,
  },
  {
    name: "returns dark palette for explicit dark mode",
    colorScheme: "dark" as const,
    expected: darkPalette,
  },
  {
    name: "falls back to light palette when unavailable",
    colorScheme: null,
    expected: lightPalette,
  },
])("getThemePalette", ({ colorScheme, expected }) => {
  test.each([{ label: "theme resolution is deterministic" }])("$label", () => {
    expect(getThemePalette(colorScheme)).toEqual(expected);
  });
});
