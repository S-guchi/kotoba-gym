import { z } from "zod";

export const scoreAxes = [
  "conclusion",
  "structure",
  "specificity",
  "technicalValidity",
  "brevity",
] as const;

export const ScoreAxisSchema = z.enum(scoreAxes);

export const PracticePromptCategorySchema = z.enum([
  "tech-explanation",
  "design-decision",
  "reporting",
  "interview",
  "escalation",
]);

export const PracticePromptDurationSchema = z.enum([
  "30〜45秒",
  "45〜60秒",
  "60〜90秒",
]);

export const PracticePromptSchema = z.object({
  id: z.string(),
  category: PracticePromptCategorySchema,
  title: z.string(),
  prompt: z.string(),
  background: z.string().min(1),
  situation: z.string(),
  goals: z.array(z.string()).min(2).max(4),
  durationLabel: PracticePromptDurationSchema,
});

export const PersonalizedPracticePromptSchema = PracticePromptSchema.extend({
  personalized: z.literal(true),
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
  goodPoints: z.array(z.string()).min(1).max(3),
  improvementPoints: z.array(z.string()).min(1).max(3),
  exampleAnswer: z.string(),
  nextFocus: z.string(),
  comparison: AttemptComparisonSchema.nullable().default(null),
});

export const PreviousAttemptPayloadSchema = AttemptEvaluationSchema.pick({
  transcript: true,
  summary: true,
  scores: true,
  goodPoints: true,
  improvementPoints: true,
  nextFocus: true,
}).extend({
  attemptNumber: z.number().int().min(1),
});

export const PracticeSessionAttemptSchema = z.object({
  attemptNumber: z.number().int().min(1),
  recordedAt: z.string(),
  evaluation: AttemptEvaluationSchema,
});

export const PracticeSessionRecordSchema = z.object({
  id: z.string(),
  prompt: PersonalizedPracticePromptSchema,
  attempts: z.array(PracticeSessionAttemptSchema).max(2),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ScoreAxis = z.infer<typeof ScoreAxisSchema>;
export type PracticePromptCategory = z.infer<
  typeof PracticePromptCategorySchema
>;
export type PracticePromptDuration = z.infer<
  typeof PracticePromptDurationSchema
>;
export type PracticePrompt = z.infer<typeof PracticePromptSchema>;
export type PersonalizedPracticePrompt = z.infer<
  typeof PersonalizedPracticePromptSchema
>;
export type EvaluationScore = z.infer<typeof EvaluationScoreSchema>;
export type AttemptComparison = z.infer<typeof AttemptComparisonSchema>;
export type AttemptEvaluation = z.infer<typeof AttemptEvaluationSchema>;
export type PreviousAttemptPayload = z.infer<
  typeof PreviousAttemptPayloadSchema
>;
export type PracticeSessionAttempt = z.infer<
  typeof PracticeSessionAttemptSchema
>;
export type PracticeSessionRecord = z.infer<typeof PracticeSessionRecordSchema>;
