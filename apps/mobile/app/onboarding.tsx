import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../src/components/primary-button";
import {
  ROLE_OPTIONS,
  SCENARIO_OPTIONS,
  STRENGTH_OPTIONS,
  TECH_STACK_OPTIONS,
} from "../src/lib/personalization-options";
import {
  savePersonalizationProfile,
  savePersonalizedPrompts,
} from "../src/lib/personalization-storage";
import { generatePersonalizedPrompts } from "../src/lib/api";
import { useThemePalette } from "../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../src/lib/theme";
import type { PersonalizationProfile } from "@kotoba-gym/core";

const ONBOARDING_STEPS = [
  {
    id: "role",
    question: "はじめまして！\nあなたの技術領域を教えてください。",
    hint: "ひとつ選んでください",
    multi: false,
    options: ROLE_OPTIONS,
    freeTextPlaceholder: "例: React Native 中心です",
  },
  {
    id: "strengths",
    question: "あなたの強みは\nどれですか？",
    hint: "複数選べます",
    multi: true,
    options: STRENGTH_OPTIONS,
    freeTextPlaceholder: "例: AIを使った試作が速いです",
  },
  {
    id: "techStack",
    question: "よく使う技術や\nツールを教えてください。",
    hint: "複数選べます",
    multi: true,
    options: TECH_STACK_OPTIONS,
    freeTextPlaceholder: "例: Expo / Supabase / RevenueCat",
  },
  {
    id: "scenarios",
    question: "どんな場面を\n練習したいですか？",
    hint: "複数選べます",
    multi: true,
    options: SCENARIO_OPTIONS,
    freeTextPlaceholder: null,
  },
] as const;

const GENERATION_STEPS = [
  "プロフィールを解析中",
  "技術スタックと照合中",
  "お題を最終調整中",
] as const;

type StepId = (typeof ONBOARDING_STEPS)[number]["id"];

const EMPTY_ANSWERS: Record<StepId, string[]> = {
  role: [],
  strengths: [],
  techStack: [],
  scenarios: [],
};

const EMPTY_FREE_TEXTS: Record<StepId, string> = {
  role: "",
  strengths: "",
  techStack: "",
  scenarios: "",
};

export default function OnboardingScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] =
    useState<Record<StepId, string[]>>(EMPTY_ANSWERS);
  const [freeTexts, setFreeTexts] =
    useState<Record<StepId, string>>(EMPTY_FREE_TEXTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currentStep = ONBOARDING_STEPS[stepIndex];
  const selectedOptions = answers[currentStep.id];
  const freeText = freeTexts[currentStep.id];
  const canContinue = selectedOptions.length > 0 || freeText.trim().length > 0;

  function toggleOption(option: string) {
    setAnswers((current) => {
      const selected = current[currentStep.id];
      if (currentStep.multi) {
        return {
          ...current,
          [currentStep.id]: selected.includes(option)
            ? selected.filter((item) => item !== option)
            : [...selected, option],
        };
      }

      return {
        ...current,
        [currentStep.id]: [option],
      };
    });
    setError(null);
  }

  function buildProfile(): PersonalizationProfile {
    return {
      role: answers.role[0] ?? "エンジニア",
      roleText: freeTexts.role.trim(),
      strengths: answers.strengths,
      strengthsText: freeTexts.strengths.trim(),
      techStack: answers.techStack,
      techStackText: freeTexts.techStack.trim(),
      scenarios: answers.scenarios,
    };
  }

  async function handleNext() {
    if (!canContinue || isSubmitting) {
      return;
    }

    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      setStepIndex((current) => current + 1);
      setError(null);
      return;
    }

    const profile = buildProfile();
    const timers: ReturnType<typeof setTimeout>[] = [];

    try {
      setIsSubmitting(true);
      setGenerationStep(0);
      setError(null);

      timers.push(setTimeout(() => setGenerationStep(1), 600));
      timers.push(setTimeout(() => setGenerationStep(2), 1400));

      const prompts = await generatePersonalizedPrompts(profile);

      await Promise.all([
        savePersonalizationProfile(profile),
        savePersonalizedPrompts(prompts),
      ]);

      setGenerationStep(3);
      timers.push(setTimeout(() => router.replace("/"), 350));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "プロフィールの保存に失敗しました。",
      );
      setGenerationStep(0);
      setIsSubmitting(false);
    } finally {
      for (const timer of timers.slice(0, 2)) {
        clearTimeout(timer);
      }
    }
  }

  function handleBack() {
    if (isSubmitting) {
      return;
    }

    if (stepIndex === 0) {
      router.back();
      return;
    }

    setStepIndex((current) => current - 1);
    setError(null);
  }

  if (isSubmitting) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.generatingScreen}>
          <View style={styles.generatingBadge}>
            <ActivityIndicator color={palette.accent} size="large" />
          </View>
          <Text style={styles.generatingTitle}>お題を生成しています</Text>
          <Text style={styles.generatingDescription}>
            あなたのプロフィールに合わせて整えています
          </Text>

          <View style={styles.generatingSteps}>
            {GENERATION_STEPS.map((label, index) => {
              const isActive = generationStep === index;
              const isDone = generationStep > index;

              return (
                <View key={label} style={styles.generatingStepRow}>
                  <View
                    style={[
                      styles.generatingStepDot,
                      isActive && styles.generatingStepDotActive,
                      isDone && styles.generatingStepDotDone,
                    ]}
                  >
                    {isDone ? (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={palette.background}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.generatingStepLabel,
                      (isActive || isDone) && styles.generatingStepLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>生成に失敗しました</Text>
              <Text style={styles.errorBody}>{error}</Text>
              <View style={styles.errorActions}>
                <PrimaryButton
                  variant="ghost"
                  onPress={() => setIsSubmitting(false)}
                >
                  戻る
                </PrimaryButton>
              </View>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.pageHeader}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={18} color={palette.text2} />
            <Text style={styles.backLabel}>
              {stepIndex === 0 ? "ホーム" : "前へ"}
            </Text>
          </Pressable>
          <Text style={styles.progressLabel}>
            {stepIndex + 1} / {ONBOARDING_STEPS.length}
          </Text>
        </View>

        <View style={styles.progressRow}>
          {ONBOARDING_STEPS.map((step, index) => (
            <View key={step.id} style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  index <= stepIndex && styles.progressFillActive,
                ]}
              />
            </View>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.copyBlock}>
            <Text style={styles.stepEyebrow}>PERSONALIZE</Text>
            <Text style={styles.question}>{currentStep.question}</Text>
            <Text style={styles.hint}>{currentStep.hint}</Text>
          </View>

          <View style={styles.optionGrid}>
            {currentStep.options.map((option) => {
              const selected = selectedOptions.includes(option);

              return (
                <Pressable
                  key={option}
                  onPress={() => toggleOption(option)}
                  style={[
                    styles.optionChip,
                    selected && styles.optionChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      selected && styles.optionLabelSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {currentStep.freeTextPlaceholder ? (
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>
                補足があれば自由に書いてください
              </Text>
              <TextInput
                multiline
                onChangeText={(value) => {
                  setFreeTexts((current) => ({
                    ...current,
                    [currentStep.id]: value,
                  }));
                  setError(null);
                }}
                placeholder={currentStep.freeTextPlaceholder}
                placeholderTextColor={palette.text3}
                style={styles.input}
                value={freeText}
              />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>保存できませんでした</Text>
              <Text style={styles.errorBody}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {stepIndex > 0 ? (
            <PrimaryButton onPress={handleBack} variant="ghost">
              戻る
            </PrimaryButton>
          ) : null}
          <PrimaryButton
            disabled={!canContinue}
            onPress={() => void handleNext()}
          >
            {stepIndex === ONBOARDING_STEPS.length - 1
              ? "お題を生成する"
              : "次へ"}
          </PrimaryButton>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.background,
    },
    flex: {
      flex: 1,
    },
    pageHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 10,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    backLabel: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text2,
    },
    progressLabel: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
    },
    progressRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    progressTrack: {
      flex: 1,
      height: 4,
      backgroundColor: palette.surface2,
      borderRadius: 999,
      overflow: "hidden",
    },
    progressFill: {
      width: "100%",
      height: "100%",
      backgroundColor: "transparent",
    },
    progressFillActive: {
      backgroundColor: palette.accent,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 24,
      gap: 22,
    },
    copyBlock: {
      gap: 10,
    },
    stepEyebrow: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
      letterSpacing: 0.8,
    },
    question: {
      fontFamily: fonts.heading,
      fontSize: 34,
      lineHeight: 40,
      color: palette.text,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text2,
      lineHeight: 22,
    },
    optionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    optionChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.borderLight,
      backgroundColor: palette.surface,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    optionChipSelected: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    optionLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: palette.text2,
    },
    optionLabelSelected: {
      color: palette.background,
    },
    inputBlock: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 20,
      padding: 16,
      gap: 10,
    },
    inputLabel: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
      letterSpacing: 0.6,
    },
    input: {
      minHeight: 110,
      textAlignVertical: "top",
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 24,
      gap: 10,
    },
    generatingScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    generatingBadge: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      marginBottom: 28,
    },
    generatingTitle: {
      fontFamily: fonts.heading,
      fontSize: 26,
      color: palette.text,
      marginBottom: 8,
    },
    generatingDescription: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text3,
      marginBottom: 32,
      textAlign: "center",
    },
    generatingSteps: {
      width: "100%",
      gap: 14,
      marginBottom: 28,
    },
    generatingStepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    generatingStepDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: palette.borderLight,
      backgroundColor: palette.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    generatingStepDotActive: {
      borderColor: palette.accent,
      backgroundColor: palette.accentDim,
    },
    generatingStepDotDone: {
      borderColor: palette.accent,
      backgroundColor: palette.accent,
    },
    generatingStepLabel: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text3,
    },
    generatingStepLabelActive: {
      color: palette.text,
    },
    errorCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: 16,
      padding: 16,
      gap: 8,
    },
    errorTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.text,
    },
    errorBody: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      color: palette.text2,
    },
    errorActions: {
      marginTop: 4,
    },
  });
}
