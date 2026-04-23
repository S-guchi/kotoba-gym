import { useState } from "react";
import {
  ActivityIndicator,
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
import { PrimaryButton } from "../../src/components/primary-button";
import { createTheme } from "../../src/lib/storage";
import {
  toCreateThemeRequest,
  validateThemeForm,
} from "../../src/lib/theme-form-helpers";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../../src/lib/theme";

export default function NewThemeScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const [theme, setTheme] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validation = validateThemeForm({
    theme,
    audience,
    goal,
  });

  async function handleSubmit() {
    const nextValidation = validateThemeForm({ theme, audience, goal });
    if (!nextValidation.isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createTheme(
        toCreateThemeRequest({ theme, audience, goal }),
      );
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={palette.text2} />
          <Text style={styles.backText}>ホーム</Text>
        </Pressable>

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>CREATE THEME</Text>
          <Text style={styles.title}>
            いま説明したいことを、練習テーマに変える。
          </Text>
          <Text style={styles.body}>
            テーマ、相手、目的だけ入れてください。LLM
            がミッションと話す骨組みを整えます。
          </Text>
        </View>

        <View style={styles.formCard}>
          <Field
            label="テーマ"
            placeholder="例: API キャッシュ戦略を見直した理由"
            value={theme}
            onChangeText={setTheme}
            error={validation.errors.theme}
            multiline
          />
          <Field
            label="相手"
            placeholder="例: 新メンバー / 面接官 / 上司"
            value={audience}
            onChangeText={setAudience}
            error={validation.errors.audience}
          />
          <Field
            label="目的"
            placeholder="例: 設計意図を誤解なく理解してほしい"
            value={goal}
            onChangeText={setGoal}
            error={validation.errors.goal}
            multiline
          />

          {submitError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          ) : null}

          <PrimaryButton
            disabled={!validation.isValid || isSubmitting}
            onPress={() => void handleSubmit()}
          >
            {isSubmitting ? "テーマを生成中..." : "テーマを作成する"}
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
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  multiline?: boolean;
}) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        multiline={props.multiline}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={palette.text3}
        style={[styles.input, props.multiline && styles.textarea]}
        value={props.value}
      />
      {props.error ? (
        <Text style={styles.fieldError}>{props.error}</Text>
      ) : null}
    </View>
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
    formCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 24,
      padding: 18,
      gap: 18,
    },
    field: {
      gap: 8,
    },
    fieldLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.text,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: fonts.body,
      fontSize: 15,
      color: palette.text,
      backgroundColor: palette.background,
    },
    textarea: {
      minHeight: 108,
      textAlignVertical: "top",
    },
    fieldError: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.danger,
    },
    errorCard: {
      backgroundColor: palette.dangerDim,
      borderRadius: 16,
      padding: 14,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.danger,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      justifyContent: "center",
    },
    loadingText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
    },
  });
}
