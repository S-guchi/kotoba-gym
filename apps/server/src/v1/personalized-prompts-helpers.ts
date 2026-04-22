import { Type } from "@google/genai";
import {
  type PersonalizationProfile,
  type PersonalizedPracticePrompt,
  PracticePromptCategorySchema,
  PracticePromptDurationSchema,
} from "@kotoba-gym/core";
import { z } from "zod";
import { ApiError } from "./api-error.js";

const PromptDraftSchema = z.object({
  title: z.string().min(1).max(40),
  prompt: z.string().min(1).max(160),
  background: z.string().min(1).max(220),
  situation: z.string().min(1).max(120),
  goals: z.array(z.string().min(1)).min(2).max(4),
  category: PracticePromptCategorySchema,
  durationLabel: PracticePromptDurationSchema,
});

export const PersonalizedPromptDraftResponseSchema = z.object({
  prompts: z.array(PromptDraftSchema).length(5),
});

export const PERSONALIZED_PROMPTS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    prompts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          prompt: { type: Type.STRING },
          background: { type: Type.STRING },
          situation: { type: Type.STRING },
          goals: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          category: {
            type: Type.STRING,
            enum: [...PracticePromptCategorySchema.options],
          },
          durationLabel: {
            type: Type.STRING,
            enum: [...PracticePromptDurationSchema.options],
          },
        },
        required: [
          "title",
          "prompt",
          "background",
          "situation",
          "goals",
          "category",
          "durationLabel",
        ],
      },
    },
  },
  required: ["prompts"],
};

export function buildPersonalizedPromptsPrompt(
  profile: PersonalizationProfile,
) {
  const strengths = [
    ...profile.strengths,
    ...(profile.strengthsText ? [profile.strengthsText] : []),
  ].join("、");
  const techStack = [
    ...profile.techStack,
    ...(profile.techStackText ? [profile.techStackText] : []),
  ].join("、");

  return `あなたはソフトウェアエンジニア向けの口頭コミュニケーション練習コーチです。
以下のプロフィールに合う個人化お題を5つ、日本語で作成してください。

## ユーザープロフィール
- 技術領域: ${profile.role}${profile.roleText ? `（${profile.roleText}）` : ""}
- 強み: ${strengths}
- 技術スタック: ${techStack}
- 練習したい場面: ${profile.scenarios.join("、")}

## 作成ルール
1. 5問すべて異なるシチュエーションにしてください。
2. 技術スタックや役割を具体的に織り込んでください。
3. title は20文字前後、prompt は1〜2文、background は2〜3文で「何が起きたか / 何が問題だったか / 何を変えたか」が伝わる内容にしてください。
4. situation は相手の期待が伝わる文にしてください。
5. goals は2〜4個で、口頭説明の改善ポイントになるものだけにしてください。background の内容を話しやすい骨組みにしてください。
6. category は tech-explanation / design-decision / reporting / interview / escalation のいずれかです。
7. durationLabel は 30〜45秒 / 45〜60秒 / 60〜90秒 のいずれかです。
8. 実務で起こりうる内容にし、抽象的な一般論だけのお題にしないでください。
9. 出力は JSON のみで返し、説明文は不要です。`;
}

function hashText(text: string) {
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

export function createPersonalizedPromptId(title: string, index: number) {
  return `personalized-${index + 1}-${hashText(title)}`;
}

export function normalizePersonalizedPrompts(
  prompts: z.infer<typeof PromptDraftSchema>[],
): PersonalizedPracticePrompt[] {
  return prompts.map((prompt, index) => ({
    ...prompt,
    id: createPersonalizedPromptId(prompt.title, index),
    personalized: true,
  }));
}

export function inferPersonalizedPromptApiError(error: unknown) {
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
        "個人化お題の生成に失敗しました。少し待ってから再試行してください。",
        503,
        "upstream_retryable",
        true,
      );
    }
  }

  return new ApiError(
    "個人化お題の生成に失敗しました。",
    500,
    "personalized_prompt_generation_failed",
  );
}
