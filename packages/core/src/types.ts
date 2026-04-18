import type { z } from "zod";
import type {
  AcousticObservationSchema,
  ChecklistItemSchema,
  ConversationMessageSchema,
  FeedbackSchema,
  JudgeResultSchema,
  SessionConfigSchema,
  SessionSnapshotSchema,
  TopicSchema,
} from "./schemas.js";

export type AcousticObservation = z.infer<typeof AcousticObservationSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type JudgeResult = z.infer<typeof JudgeResultSchema>;
export type Feedback = z.infer<typeof FeedbackSchema>;
export type SessionConfig = z.infer<typeof SessionConfigSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type SessionSnapshot = z.infer<typeof SessionSnapshotSchema>;
export type SessionState = "idle" | "active" | "ended" | "finalized";
export type ChecklistState = "empty" | "partial" | "filled";

export interface AudioTurnInput {
  audio: Buffer;
  mimeType: string;
  transcriptHint?: string;
}

export interface AudioTurnResult {
  reply: string;
  transcript: string;
  checklist: ChecklistItem[];
  acousticObservations: AcousticObservation[];
  isEnded: boolean;
}
