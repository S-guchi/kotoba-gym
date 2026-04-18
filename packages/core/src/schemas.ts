import { z } from "zod";

export const ChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  state: z.enum(["empty", "partial", "filled"]).default("empty"),
});

export const AcousticObservationSchema = z.object({
  type: z.enum([
    "filler",
    "long_pause",
    "unclear_pronunciation",
    "confident",
    "hesitant",
  ]),
  context: z.string(),
  note: z.string(),
});

export const TopicSchema = z.object({
  topicId: z.string(),
  topicTitle: z.string(),
  checklist: z.array(ChecklistItemSchema).length(6),
});

export const JudgeResultSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string(),
      newState: z.enum(["empty", "partial", "filled"]),
      reason: z.string(),
    }),
  ),
  transcript: z.string().optional(),
  acousticObservations: z.array(AcousticObservationSchema).default([]),
});

export const FeedbackSchema = z.object({
  goodPoints: z.array(z.object({ quote: z.string(), why: z.string() })).max(2),
  improvements: z
    .array(
      z.object({
        missingItemId: z.string(),
        suggestionExample: z.string(),
        why: z.string(),
      }),
    )
    .max(2),
  summary: z.string(),
});

export const SessionConfigSchema = z.object({
  maxTurns: z.number().int().positive().default(8),
  judgeTemperature: z.number().min(0).max(2).default(0.2),
  personaTemperature: z.number().min(0).max(2).default(0.7),
  logDir: z.string().default("./logs"),
  geminiApiKey: z.string(),
  geminiModel: z.string().default("gemini-3-flash-preview"),
});

export const ConversationMessageSchema = z.object({
  role: z.enum(["user", "pm"]),
  content: z.string(),
  timestamp: z.string(),
});

export const SessionSnapshotSchema = z.object({
  topicId: z.string(),
  topicTitle: z.string(),
  config: SessionConfigSchema.omit({ geminiApiKey: true }),
  checklist: z.array(ChecklistItemSchema),
  history: z.array(ConversationMessageSchema),
  acousticObservations: z.array(AcousticObservationSchema),
  turnCount: z.number(),
  state: z.enum(["idle", "active", "ended", "finalized"]),
  feedback: FeedbackSchema.nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
});
