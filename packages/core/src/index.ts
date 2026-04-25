import { z } from "zod";

export const MaterialKeySchema = z.enum([
  "current",
  "issue",
  "background",
  "concern",
  "purpose",
  "request",
  "unclear",
]);
export type MaterialKey = z.infer<typeof MaterialKeySchema>;

export const DraftInputSchema = z.object({
  text: z.string().min(1),
});
export type DraftInput = z.infer<typeof DraftInputSchema>;

export const MaterialItemSchema = z.object({
  key: MaterialKeySchema,
  title: z.string().min(1),
  content: z.string(),
  placeholder: z.string().optional(),
});
export type MaterialItem = z.infer<typeof MaterialItemSchema>;

export const OrganizedMaterialsSchema = z.object({
  title: z.string().min(1),
  items: z.array(MaterialItemSchema).min(1),
});
export type OrganizedMaterials = z.infer<typeof OrganizedMaterialsSchema>;

export const ConclusionCandidateSchema = z.object({
  id: z.string().min(1),
  label: z.enum(["A", "B", "C"]),
  text: z.string().min(1),
});
export type ConclusionCandidate = z.infer<typeof ConclusionCandidateSchema>;

export const SpeechStepSchema = z.object({
  order: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string().min(1),
  reason: z.string().optional(),
});
export type SpeechStep = z.infer<typeof SpeechStepSchema>;

export const SpeechPlanSchema = z.object({
  title: z.string().min(1),
  lead: z.string().min(1),
  steps: z.array(SpeechStepSchema).min(1),
});
export type SpeechPlan = z.infer<typeof SpeechPlanSchema>;

export const GeneratedScriptSchema = z.object({
  thirtySecond: z.string().min(1),
  oneMinute: z.string().optional(),
  slackMessage: z.string().optional(),
  keywords: z.array(z.string().min(1)).min(1),
});
export type GeneratedScript = z.infer<typeof GeneratedScriptSchema>;

export const RehearsalResultSchema = z.object({
  recorded: z.boolean(),
  durationSeconds: z.number().int().nonnegative(),
  spokenText: z.string().min(1),
  recordedAt: z.string().datetime().optional(),
});
export type RehearsalResult = z.infer<typeof RehearsalResultSchema>;

export const FeedbackSchema = z.object({
  positives: z.array(z.string().min(1)),
  improvements: z.array(z.string().min(1)),
  nextPhrase: z.string().min(1),
  before: z.string().min(1),
  after: z.string().min(1),
  structureLevel: z.number().int().min(1).max(5).optional(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const SessionRecordSchema = z.object({
  id: z.string().min(1),
  ownerKey: z.string().min(1),
  title: z.string().min(1),
  rawInput: z.string(),
  materials: OrganizedMaterialsSchema.nullable(),
  conclusionCandidates: z.array(ConclusionCandidateSchema),
  selectedConclusion: ConclusionCandidateSchema.nullable(),
  speechPlan: SpeechPlanSchema.nullable(),
  script: GeneratedScriptSchema.nullable(),
  rehearsal: RehearsalResultSchema.nullable(),
  feedback: FeedbackSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SessionRecord = z.infer<typeof SessionRecordSchema>;

export const CreateSessionRequestSchema = z.object({
  ownerKey: z.string().min(1),
  rawInput: z.string(),
  title: z.string().optional(),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const UpdateSessionRequestSchema = z.object({
  ownerKey: z.string().min(1),
  title: z.string().min(1).optional(),
  rawInput: z.string().optional(),
  materials: OrganizedMaterialsSchema.nullable().optional(),
  conclusionCandidates: z.array(ConclusionCandidateSchema).optional(),
  selectedConclusion: ConclusionCandidateSchema.nullable().optional(),
  speechPlan: SpeechPlanSchema.nullable().optional(),
  script: GeneratedScriptSchema.nullable().optional(),
  rehearsal: RehearsalResultSchema.nullable().optional(),
  feedback: FeedbackSchema.nullable().optional(),
});
export type UpdateSessionRequest = z.infer<typeof UpdateSessionRequestSchema>;

export const OrganizePackageRequestSchema = z.object({
  rawInput: z.string().min(1),
});
export type OrganizePackageRequest = z.infer<
  typeof OrganizePackageRequestSchema
>;

export const OrganizePackageResponseSchema = z.object({
  materials: OrganizedMaterialsSchema,
  conclusionCandidates: z.array(ConclusionCandidateSchema).length(3),
  selectedConclusion: ConclusionCandidateSchema,
  speechPlan: SpeechPlanSchema,
  script: GeneratedScriptSchema,
});
export type OrganizePackageResponse = z.infer<
  typeof OrganizePackageResponseSchema
>;

export const TranscribeAudioRequestSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().min(1),
});
export type TranscribeAudioRequest = z.infer<
  typeof TranscribeAudioRequestSchema
>;

export const TranscribeAudioResponseSchema = z.object({
  text: z.string().min(1),
});
export type TranscribeAudioResponse = z.infer<
  typeof TranscribeAudioResponseSchema
>;

export const FeedbackRequestSchema = z.object({
  rawInput: z.string().min(1),
  materials: OrganizedMaterialsSchema,
  conclusion: ConclusionCandidateSchema,
  speechPlan: SpeechPlanSchema,
  script: GeneratedScriptSchema,
  rehearsal: RehearsalResultSchema,
});
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

export const FeedbackResponseSchema = z.object({
  feedback: FeedbackSchema,
});
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
