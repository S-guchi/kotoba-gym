import type { CreateThemeRequest } from "@kotoba-gym/core";

export interface ThemeFormState {
  theme: string;
  personaId: string;
  goal: string;
}

export interface ThemeFormValidation {
  isValid: boolean;
  errors: Partial<Record<keyof ThemeFormState, string>>;
}

function validateField(value: string, label: string, maxLength: number) {
  const trimmed = value.trim();
  if (!trimmed) {
    return `${label}を入力してください。`;
  }
  if (trimmed.length > maxLength) {
    return `${label}は${maxLength}文字以内で入力してください。`;
  }
  return null;
}

export function validateThemeForm(state: ThemeFormState): ThemeFormValidation {
  const errors = {
    theme: validateField(state.theme, "テーマ", 120) ?? undefined,
    personaId: validateField(state.personaId, "相手", 80) ?? undefined,
    goal: validateField(state.goal, "目的", 80) ?? undefined,
  };

  return {
    isValid: !errors.theme && !errors.personaId && !errors.goal,
    errors,
  };
}

export function validateThemeStep(theme: string): ThemeFormValidation {
  const error = validateField(theme, "テーマ", 120) ?? undefined;
  return {
    isValid: !error,
    errors: {
      theme: error,
    },
  };
}

export function validatePersonaStep(personaId: string): ThemeFormValidation {
  const error = validateField(personaId, "相手", 80) ?? undefined;
  return {
    isValid: !error,
    errors: {
      personaId: error,
    },
  };
}

export function validateGoalStep(goal: string): ThemeFormValidation {
  const error = validateField(goal, "目的", 80) ?? undefined;
  return {
    isValid: !error,
    errors: {
      goal: error,
    },
  };
}

export function toCreateThemeRequest(
  state: ThemeFormState,
): CreateThemeRequest {
  return {
    theme: state.theme.trim(),
    personaId: state.personaId.trim(),
    goal: state.goal.trim(),
  };
}
