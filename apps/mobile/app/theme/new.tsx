import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { Persona } from "@kotoba-gym/core";
import { PrimaryButton } from "../../src/components/primary-button";
import { StepGoal } from "../../src/components/theme-wizard/step-goal";
import { StepIndicator } from "../../src/components/theme-wizard/step-indicator";
import { StepPersona } from "../../src/components/theme-wizard/step-persona";
import { StepTheme } from "../../src/components/theme-wizard/step-theme";
import { fetchPersonas } from "../../src/lib/api";
import { createTheme } from "../../src/lib/storage";
import { GOAL_TIPS, THEME_TIPS } from "../../src/lib/theme-wizard-tips";
import {
  toCreateThemeRequest,
  type ThemeFormState,
  validateGoalStep,
  validatePersonaStep,
  validateThemeForm,
  validateThemeStep,
} from "../../src/lib/theme-form-helpers";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../../src/lib/theme";

const TOTAL_STEPS = 3;

const initialFormState: ThemeFormState = {
  theme: "",
  personaId: "",
  goal: "",
};

export default function NewThemeScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const { width } = useWindowDimensions();
  const stepWidth = Math.max(width - 40, 1);
  const translateX = useSharedValue(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(initialFormState);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personasError, setPersonasError] = useState<string | null>(null);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revealedErrors, setRevealedErrors] = useState<
    Partial<Record<keyof ThemeFormState, boolean>>
  >({});

  const selectedPersona =
    personas.find((persona) => persona.id === form.personaId) ?? null;
  const themeValidation = validateThemeStep(form.theme);
  const personaValidation = validatePersonaStep(form.personaId);
  const goalValidation = validateGoalStep(form.goal);
  const fullValidation = validateThemeForm(form);

  useEffect(() => {
    translateX.value = withTiming(-currentStep * stepWidth, { duration: 280 });
  }, [currentStep, stepWidth, translateX]);

  useEffect(() => {
    void loadPersonas();
  }, []);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  async function loadPersonas() {
    try {
      setIsLoadingPersonas(true);
      const nextPersonas = await fetchPersonas();
      setPersonas(nextPersonas);
      setPersonasError(null);
    } catch (cause) {
      setPersonasError(
        cause instanceof Error
          ? cause.message
          : "相手候補を取得できませんでした。",
      );
    } finally {
      setIsLoadingPersonas(false);
    }
  }

  function revealErrorFields(fields: (keyof ThemeFormState)[]) {
    setRevealedErrors((current) => ({
      ...current,
      ...Object.fromEntries(fields.map((field) => [field, true])),
    }));
  }

  function goToStep(step: number) {
    setCurrentStep(step);
  }

  function handleBack() {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
      return;
    }

    router.back();
  }

  function handleNext() {
    if (currentStep === 0) {
      if (!themeValidation.isValid) {
        revealErrorFields(["theme"]);
        return;
      }
      goToStep(1);
      return;
    }

    if (currentStep === 1) {
      if (!personaValidation.isValid) {
        revealErrorFields(["personaId"]);
        return;
      }
      goToStep(2);
    }
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (!fullValidation.isValid) {
      const invalidFields = Object.entries(fullValidation.errors)
        .filter(([, value]) => value)
        .map(([key]) => key as keyof ThemeFormState);
      revealErrorFields(invalidFields);

      if (fullValidation.errors.theme) {
        goToStep(0);
      } else if (fullValidation.errors.personaId) {
        goToStep(1);
      } else if (fullValidation.errors.goal) {
        goToStep(2);
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createTheme(toCreateThemeRequest(form));
      router.replace({
        pathname: "/theme/[themeId]",
        params: { themeId: created.id },
      });
    } catch (cause) {
      setSubmitError(
        cause instanceof Error
          ? cause.message
          : "テーマを作成できませんでした。",
      );
      setIsSubmitting(false);
    }
  }

  const stepFooterLabel = useMemo(() => {
    if (currentStep === 0) {
      return "相手を選ぶ";
    }
    if (currentStep === 1) {
      return "目的を入力する";
    }
    return isSubmitting ? "テーマを生成中..." : "テーマを作成する";
  }, [currentStep, isSubmitting]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={18} color={palette.text2} />
          <Text style={styles.backText}>
            {currentStep === 0 ? "ホーム" : "前のステップ"}
          </Text>
        </Pressable>

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>CREATE THEME</Text>
          <Text style={styles.title}>3ステップで練習テーマを整える。</Text>
          <Text style={styles.body}>
            テーマ、相手、目的を順番に固定します。相手は自由入力ではなくペルソナから選び、練習しやすい密度に揃えます。
          </Text>
        </View>

        <View style={styles.wizardCard}>
          <View style={styles.wizardHeader}>
            <StepIndicator currentStep={currentStep} palette={palette} />
          </View>

          <View style={styles.viewport}>
            <Animated.View
              style={[
                styles.track,
                { width: stepWidth * TOTAL_STEPS },
                trackStyle,
              ]}
            >
              <View style={[styles.stepPane, { width: stepWidth }]}>
                <StepTheme
                  value={form.theme}
                  error={
                    revealedErrors.theme
                      ? themeValidation.errors.theme
                      : undefined
                  }
                  onChangeText={(theme) => {
                    setForm((current) => ({ ...current, theme }));
                    setSubmitError(null);
                  }}
                  palette={palette}
                  tips={THEME_TIPS}
                />
              </View>

              <View style={[styles.stepPane, { width: stepWidth }]}>
                <StepPersona
                  personas={personas}
                  selectedPersonaId={form.personaId}
                  error={
                    revealedErrors.personaId
                      ? personaValidation.errors.personaId
                      : undefined
                  }
                  isLoading={isLoadingPersonas}
                  loadError={personasError}
                  onRetry={() => void loadPersonas()}
                  onSelect={(personaId) => {
                    setForm((current) => ({ ...current, personaId }));
                    setSubmitError(null);
                  }}
                  palette={palette}
                />
              </View>

              <View style={[styles.stepPane, { width: stepWidth }]}>
                <StepGoal
                  value={form.goal}
                  error={
                    revealedErrors.goal ? goalValidation.errors.goal : undefined
                  }
                  selectedPersona={selectedPersona}
                  onChangeText={(goal) => {
                    setForm((current) => ({ ...current, goal }));
                    setSubmitError(null);
                  }}
                  palette={palette}
                  tips={GOAL_TIPS}
                />
              </View>
            </Animated.View>
          </View>

          {selectedPersona && currentStep > 0 ? (
            <View style={styles.selectionRow}>
              <Text style={styles.selectionLabel}>選択中の相手</Text>
              <View style={styles.selectionBadge}>
                <Text style={styles.selectionBadgeText}>
                  {selectedPersona.emoji} {selectedPersona.name}
                </Text>
              </View>
            </View>
          ) : null}

          {submitError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            {currentStep > 0 ? (
              <PrimaryButton variant="ghost" onPress={handleBack}>
                戻る
              </PrimaryButton>
            ) : null}
            <PrimaryButton
              disabled={
                isSubmitting ||
                (currentStep === 1 && (isLoadingPersonas || !!personasError))
              }
              onPress={() =>
                currentStep === TOTAL_STEPS - 1
                  ? void handleSubmit()
                  : handleNext()
              }
            >
              {stepFooterLabel}
            </PrimaryButton>
          </View>

          {isSubmitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={palette.accent} />
              <Text style={styles.loadingText}>
                ミッションと構成を整理しています
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.background,
    },
    scroll: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 32,
      gap: 16,
    },
    backBtn: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    backText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text2,
    },
    heroCard: {
      backgroundColor: palette.surface2,
      borderRadius: 28,
      padding: 24,
      gap: 12,
    },
    eyebrow: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 1.4,
      color: palette.accentWarm,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 34,
      lineHeight: 38,
      color: palette.text,
    },
    body: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    wizardCard: {
      backgroundColor: palette.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: "hidden",
      gap: 18,
      paddingVertical: 20,
    },
    wizardHeader: {
      paddingHorizontal: 20,
    },
    viewport: {
      overflow: "hidden",
    },
    track: {
      flexDirection: "row",
    },
    stepPane: {
      paddingHorizontal: 20,
    },
    selectionRow: {
      paddingHorizontal: 20,
      gap: 8,
    },
    selectionLabel: {
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: 0.6,
      color: palette.text3,
    },
    selectionBadge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: palette.accentDim,
    },
    selectionBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: palette.text,
    },
    errorCard: {
      marginHorizontal: 20,
      borderRadius: 18,
      backgroundColor: palette.dangerDim,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      color: palette.danger,
    },
    footer: {
      paddingHorizontal: 20,
      flexDirection: "row",
      gap: 12,
    },
    loadingRow: {
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    loadingText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
    },
  });
}
