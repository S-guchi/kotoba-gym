import { z } from "zod";
import { PracticePromptSchema } from "./src/practice";

// React Native では source を直接読むため、NodeNext 向け .js import を避けた橋渡しを置く。
export const PersonalizationProfileSchema = z.object({
  role: z.string().min(1),
  roleText: z.string().trim().max(80).default(""),
  strengths: z.array(z.string().min(1)).min(1).max(8),
  strengthsText: z.string().trim().max(120).default(""),
  techStack: z.array(z.string().min(1)).min(1).max(8),
  techStackText: z.string().trim().max(120).default(""),
  scenarios: z.array(z.string().min(1)).min(1).max(8),
});

export const PersonalizedPracticePromptSchema = PracticePromptSchema.extend({
  personalized: z.literal(true),
});

export const GeneratePersonalizedPromptsRequestSchema =
  PersonalizationProfileSchema;

export const GeneratePersonalizedPromptsResponseSchema = z.object({
  prompts: z.array(PersonalizedPracticePromptSchema).length(5),
});

export type PersonalizationProfile = z.infer<
  typeof PersonalizationProfileSchema
>;
export type PersonalizedPracticePrompt = z.infer<
  typeof PersonalizedPracticePromptSchema
>;
export type GeneratePersonalizedPromptsRequest = z.infer<
  typeof GeneratePersonalizedPromptsRequestSchema
>;
export type GeneratePersonalizedPromptsResponse = z.infer<
  typeof GeneratePersonalizedPromptsResponseSchema
>;
