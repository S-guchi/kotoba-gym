import { z } from "zod";

export const ChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  state: z.enum(["empty", "partial", "filled"]).default("empty"),
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
    })
  ),
});

export const FeedbackSchema = z.object({
  goodPoints: z
    .array(z.object({ quote: z.string(), why: z.string() }))
    .max(2),
  improvements: z
    .array(
      z.object({
        missingItemId: z.string(),
        suggestionExample: z.string(),
        why: z.string(),
      })
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
  turnCount: z.number(),
  state: z.enum(["idle", "active", "ended", "finalized"]),
  feedback: FeedbackSchema.nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
});
