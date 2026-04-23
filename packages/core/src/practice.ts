import { z } from "zod";
import { PersonaSchema } from "./persona.js";

export const scoreAxes = [
  "conclusion",
  "structure",
  "specificity",
  "technicalValidity",
  "brevity",
] as const;

export const ScoreAxisSchema = z.enum(scoreAxes);

export const ThemeDurationSchema = z.enum(["30〜45秒", "45〜60秒", "60〜90秒"]);

export const ThemeInputSchema = z.object({
  theme: z.string().trim().min(1).max(120),
  personaId: z.string().trim().min(1).max(80),
  goal: z.string().trim().min(1).max(80),
});

export const ThemeRecordSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1).max(80),
  userInput: ThemeInputSchema,
  persona: PersonaSchema,
  mission: z.string().trim().min(1).max(160),
  audienceSummary: z.string().trim().min(1).max(120),
  talkingPoints: z.array(z.string().trim().min(1).max(80)).min(3).max(4),
  recommendedStructure: z.array(z.string().trim().min(1).max(80)).min(3).max(4),
  durationLabel: ThemeDurationSchema,
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export const CreateThemeRequestSchema = ThemeInputSchema;

export const CreateThemeResponseSchema = z.object({
  theme: ThemeRecordSchema,
});

export const ListThemesResponseSchema = z.object({
  themes: z.array(ThemeRecordSchema),
});

export const EvaluationScoreSchema = z.object({
  axis: ScoreAxisSchema,
  score: z.number().int().min(1).max(5),
  comment: z.string(),
});

export const AttemptComparisonSchema = z.object({
  scoreDiff: z.array(
    z.object({
      axis: ScoreAxisSchema,
      before: z.number().int().min(1).max(5),
      after: z.number().int().min(1).max(5),
      diff: z.number().int(),
    }),
  ),
  improvedPoints: z.array(z.string()).min(1).max(3),
  remainingPoints: z.array(z.string()).min(1).max(3),
  comparisonSummary: z.string(),
});

export const AttemptEvaluationSchema = z.object({
  transcript: z.string(),
  summary: z.string(),
  scores: z.array(EvaluationScoreSchema).length(scoreAxes.length),
  goodPoints: z.array(z.string()).max(3),
  improvementPoints: z.array(z.string()).min(1).max(3),
  exampleAnswer: z.string(),
  nextFocus: z.string(),
  comparison: AttemptComparisonSchema.nullable().default(null),
});

export const PreviousEvaluationPayloadSchema = AttemptEvaluationSchema.pick({
  transcript: true,
  summary: true,
  scores: true,
  goodPoints: true,
  improvementPoints: true,
  nextFocus: true,
});

export const PracticeSessionRecordSchema = z.object({
  id: z.string(),
  theme: ThemeRecordSchema,
  evaluation: AttemptEvaluationSchema.nullable().default(null),
  recordedAt: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ScoreAxis = z.infer<typeof ScoreAxisSchema>;
export type ThemeDuration = z.infer<typeof ThemeDurationSchema>;
export type ThemeInput = z.infer<typeof ThemeInputSchema>;
export type ThemeRecord = z.infer<typeof ThemeRecordSchema>;
export type CreateThemeRequest = z.infer<typeof CreateThemeRequestSchema>;
export type CreateThemeResponse = z.infer<typeof CreateThemeResponseSchema>;
export type ListThemesResponse = z.infer<typeof ListThemesResponseSchema>;
export type EvaluationScore = z.infer<typeof EvaluationScoreSchema>;
export type AttemptComparison = z.infer<typeof AttemptComparisonSchema>;
export type AttemptEvaluation = z.infer<typeof AttemptEvaluationSchema>;
export type PreviousEvaluationPayload = z.infer<
  typeof PreviousEvaluationPayloadSchema
>;
export type PracticeSessionRecord = z.infer<typeof PracticeSessionRecordSchema>;
