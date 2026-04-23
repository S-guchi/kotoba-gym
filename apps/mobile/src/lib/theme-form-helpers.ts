import type { CreateThemeRequest } from "@kotoba-gym/core";

export interface ThemeFormState {
  theme: string;
  audience: string;
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
    audience: validateField(state.audience, "相手", 80) ?? undefined,
    goal: validateField(state.goal, "目的", 80) ?? undefined,
  };

  return {
    isValid: !errors.theme && !errors.audience && !errors.goal,
    errors,
  };
}

export function toCreateThemeRequest(
  state: ThemeFormState,
): CreateThemeRequest {
  return {
    theme: state.theme.trim(),
    audience: state.audience.trim(),
    goal: state.goal.trim(),
  };
}
