import type {
  PersonalizedPracticePrompt,
  PracticePrompt,
} from "@kotoba-gym/core";

export function findPromptById(params: {
  defaultPrompts: PracticePrompt[];
  personalizedPrompts: PersonalizedPracticePrompt[];
  promptId: string;
}) {
  return (
    params.personalizedPrompts.find(
      (prompt) => prompt.id === params.promptId,
    ) ??
    params.defaultPrompts.find((prompt) => prompt.id === params.promptId) ??
    null
  );
}
