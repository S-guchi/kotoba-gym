import type { PersonalizedPracticePrompt } from "@kotoba-gym/core";

export function findPromptById(params: {
  prompts: PersonalizedPracticePrompt[];
  promptId: string;
}) {
  return params.prompts.find((prompt) => prompt.id === params.promptId) ?? null;
}
