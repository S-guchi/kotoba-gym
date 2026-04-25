import { Type } from "@google/genai";
import {
  type CreateThemeRequest,
  type Persona,
  ThemeDurationSchema,
  type ThemeRecord,
} from "@kotoba-gym/core";
import { z } from "zod";
import { ApiError } from "./api-error.js";

const ThemeDraftSchema = z.object({
  title: z.string().trim().min(1).max(80),
  mission: z.string().trim().min(1).max(160),
  audienceSummary: z.string().trim().min(1).max(120),
  talkingPoints: z.array(z.string().trim().min(1).max(80)).min(3).max(4),
  recommendedStructure: z.array(z.string().trim().min(1).max(80)).min(3).max(4),
  durationLabel: ThemeDurationSchema,
});

export const CreateThemeDraftResponseSchema = z.object({
  theme: ThemeDraftSchema,
});

export const CREATE_THEME_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    theme: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        mission: { type: Type.STRING },
        audienceSummary: { type: Type.STRING },
        talkingPoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        recommendedStructure: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        durationLabel: {
          type: Type.STRING,
          enum: [...ThemeDurationSchema.options],
        },
      },
      required: [
        "title",
        "mission",
        "audienceSummary",
        "talkingPoints",
        "recommendedStructure",
        "durationLabel",
      ],
    },
  },
  required: ["theme"],
};

export function buildCreateThemePrompt(params: {
  input: CreateThemeRequest;
  persona: Persona;
}) {
  return `あなたは口頭説明の練習コーチです。
ユーザーが持ち込んだ説明テーマを、すぐ練習できる形に日本語で整理してください。

## ユーザー入力
- テーマ: ${params.input.theme}
- ペルソナ: ${params.persona.name}
- ペルソナ補足: ${params.persona.description}
- 目的: ${params.input.goal}

## 生成ルール
1. title はテーマを短く言い換えた見出しにしてください。
2. mission はペルソナと目的が一文で伝わる行動目標にしてください。
3. audienceSummary はペルソナの前提知識や期待を短くまとめてください。
4. talkingPoints は3〜4個に絞り、話すべき論点だけを具体的に書いてください。
5. recommendedStructure は3〜4個に絞り、自然な説明順を短い文で示してください。
6. durationLabel は 30〜45秒 / 45〜60秒 / 60〜90秒 から選んでください。
7. 架空の固有名詞や事実を追加しすぎず、ユーザー入力から妥当な説明準備として整理してください。
8. 出力は JSON のみで返し、説明文は不要です。`;
}

function hashText(text: string) {
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

export function createThemeId(params: {
  input: CreateThemeRequest;
  persona: Persona;
  now: string;
}) {
  return `theme-${hashText(`${params.input.theme}:${params.persona.id}:${params.input.goal}:${params.now}`)}`;
}

export function normalizeGeneratedTheme(params: {
  input: CreateThemeRequest;
  persona: Persona;
  rawTheme: z.infer<typeof ThemeDraftSchema>;
  now: string;
}): ThemeRecord {
  return {
    id: createThemeId(params),
    title: params.rawTheme.title,
    userInput: params.input,
    persona: params.persona,
    mission: params.rawTheme.mission,
    audienceSummary: params.rawTheme.audienceSummary,
    talkingPoints: params.rawTheme.talkingPoints,
    recommendedStructure: params.rawTheme.recommendedStructure,
    durationLabel: params.rawTheme.durationLabel,
    createdAt: params.now,
    updatedAt: params.now,
  };
}

export function inferThemeApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("timeout") ||
      message.includes("deadline") ||
      message.includes("rate") ||
      message.includes("quota") ||
      message.includes("503")
    ) {
      return new ApiError(
        "テーマの生成に失敗しました。少し待ってから再試行してください。",
        503,
        "upstream_retryable",
        true,
      );
    }
  }

  return new ApiError(
    "テーマの生成に失敗しました。",
    500,
    "theme_generation_failed",
  );
}
