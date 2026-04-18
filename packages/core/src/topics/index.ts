import type { Topic } from "../types.js";
import { presets } from "./presets.js";

export function getTopics(): Topic[] {
  return presets;
}

export function getTopicById(id: string): Topic {
  const topic = presets.find((t) => t.topicId === id);
  if (!topic) {
    throw new Error(`Topic not found: ${id}`);
  }
  return topic;
}
