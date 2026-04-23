export type ThemePalette = {
  background: string;
  surface: string;
  surface2: string;
  border: string;
  borderLight: string;
  text: string;
  text2: string;
  text3: string;
  accent: string;
  accentDim: string;
  accentWarm: string;
  accentWarmDim: string;
  danger: string;
  dangerDim: string;
  white: string;
  black: string;
};

export const lightPalette: ThemePalette = {
  background: "#f5f4f0",
  surface: "#ffffff",
  surface2: "#eeecea",
  border: "#dedad4",
  borderLight: "#ccc8c0",
  text: "#1a1916",
  text2: "#6b6860",
  text3: "#a09c94",
  accent: "#3a9470",
  accentDim: "rgba(58,148,112,0.10)",
  accentWarm: "#9a7a3a",
  accentWarmDim: "rgba(154,122,58,0.10)",
  danger: "#b85a48",
  dangerDim: "rgba(184,90,72,0.10)",
  white: "#ffffff",
  black: "#000000",
};

export const darkPalette: ThemePalette = {
  background: "#0c0c0e",
  surface: "#141417",
  surface2: "#1c1c21",
  border: "#252530",
  borderLight: "#2e2e3a",
  text: "#e8e6e0",
  text2: "#8c8a98",
  text3: "#5a5870",
  accent: "#6eb89a",
  accentDim: "rgba(110,184,154,0.12)",
  accentWarm: "#c4a46b",
  accentWarmDim: "rgba(196,164,107,0.12)",
  danger: "#c47a6b",
  dangerDim: "rgba(196,122,107,0.12)",
  white: "#ffffff",
  black: "#000000",
};

export const palette = lightPalette;

export function getThemePalette(
  colorScheme: "light" | "dark" | null | undefined,
) {
  return colorScheme === "dark" ? darkPalette : lightPalette;
}

export const fonts = {
  heading: "InstrumentSerif_400Regular",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemiBold: "DMSans_600SemiBold",
  mono: "DMMono_400Regular",
  monoMedium: "DMMono_500Medium",
} as const;
