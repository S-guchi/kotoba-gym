export const palette = {
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
} as const;

export const fonts = {
  heading: "InstrumentSerif_400Regular",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemiBold: "DMSans_600SemiBold",
  mono: "DMMono_400Regular",
  monoMedium: "DMMono_500Medium",
} as const;

export const categoryLabels: Record<string, string> = {
  "tech-explanation": "技術説明",
  "design-decision": "設計判断",
  reporting: "報連相",
  interview: "面接",
  escalation: "エスカレーション",
};
