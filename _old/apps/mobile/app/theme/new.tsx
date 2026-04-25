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
const SCREEN_HORIZONTAL_PADDING = 20;
const CONTEXT_THEME_MAX_LENGTH = 12;
const STEP_TRANSITION_DURATION_MS = 280;

const initialFormState: ThemeFormState = {
  theme: "",
  personaId: "",
  goal: "",
};

export default function NewThemeScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const { width } = useWindowDimensions();
  const stepWidth = Math.max(width - SCREEN_HORIZONTAL_PADDING * 2, 1);
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
    translateX.value = withTiming(-currentStep * stepWidth, {
      duration: STEP_TRANSITION_DURATION_MS,
    });
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
      return "相手を選ぶ →";
    }
    if (currentStep === 1) {
      return "目的を入力する →";
    }
    return isSubmitting ? "テーマを生成中..." : "テーマを作成する ✓";
  }, [currentStep, isSubmitting]);

  const truncatedTheme =
    form.theme.length > CONTEXT_THEME_MAX_LENGTH
      ? `${form.theme.slice(0, CONTEXT_THEME_MAX_LENGTH)}…`
      : form.theme;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── 固定ヘッダー ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="chevron-back" size={16} color={palette.text2} />
            <Text style={styles.backText}>
              {currentStep === 0 ? "ホーム" : "戻る"}
            </Text>
          </Pressable>
          <Text style={styles.stepCounter}>
            {currentStep + 1}/{TOTAL_STEPS}
          </Text>
        </View>
        <StepIndicator
          currentStep={currentStep}
          onStepPress={goToStep}
          palette={palette}
        />
      </View>

      {/* ── スクロール領域 ── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* 入力済み内容のショートカット */}
        {currentStep >= 1 && form.theme ? (
          <View style={styles.contextRow}>
            <Pressable style={styles.contextPill} onPress={() => goToStep(0)}>
              <Text style={styles.contextPillLabel}>テーマ</Text>
              <Text style={styles.contextPillValue} numberOfLines={1}>
                {truncatedTheme}
              </Text>
            </Pressable>
            {currentStep >= 2 && selectedPersona ? (
              <Pressable style={styles.contextPill} onPress={() => goToStep(1)}>
                <Text style={styles.contextPillLabel}>相手</Text>
                <Text style={styles.contextPillValue}>
                  {selectedPersona.emoji} {selectedPersona.name}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* ステップ切り替え */}
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

        {submitError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── 固定フッター ── */}
      <View style={styles.footer}>
        <PrimaryButton
          disabled={
            isSubmitting ||
            (currentStep === 1 && (isLoadingPersonas || !!personasError))
          }
          onPress={() =>
            currentStep === TOTAL_STEPS - 1 ? void handleSubmit() : handleNext()
          }
        >
          {stepFooterLabel}
        </PrimaryButton>
        {isSubmitting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={palette.accent} />
            <Text style={styles.loadingText}>
              ミッションと構成を整理しています
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.background,
    },
    /* ── ヘッダー ── */
    header: {
      backgroundColor: palette.surface,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
      paddingTop: 8,
      paddingBottom: 16,
      gap: 14,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    backText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text2,
    },
    stepCounter: {
      fontFamily: fonts.monoMedium,
      fontSize: 13,
      color: palette.text2,
    },
    /* ── スクロール領域 ── */
    scrollView: {
      flex: 1,
    },
    scroll: {
      paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
      paddingTop: 20,
      paddingBottom: 16,
      gap: 18,
    },
    contextRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    contextPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.border,
    },
    contextPillLabel: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
    },
    contextPillValue: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: palette.text,
      maxWidth: 160,
    },
    viewport: {
      overflow: "hidden",
    },
    track: {
      flexDirection: "row",
    },
    stepPane: {
      paddingRight: 20,
    },
    /* ── エラー表示 ── */
    errorCard: {
      borderRadius: 16,
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
    /* ── フッター ── */
    footer: {
      paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      backgroundColor: palette.background,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    loadingText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
    },
  });
}
