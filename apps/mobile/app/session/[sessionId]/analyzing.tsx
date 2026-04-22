import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../../../src/components/primary-button";
import { MobileApiError, submitEvaluation } from "../../../src/lib/api";
import {
  getPendingRecordingPayload,
  removePendingRecordingPayload,
} from "../../../src/lib/pending-recording-store";
import { cachePracticeSession } from "../../../src/lib/storage";
import { useThemePalette } from "../../../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../../../src/lib/theme";

const STEPS = [
  "音声を文字起こししています",
  "フィードバックを生成しています",
  "良かった点と改善ポイントを整理しています",
];

export default function AnalyzingScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("録音データが見つかりません。");
      return;
    }

    const payload = getPendingRecordingPayload(sessionId);
    if (!payload || !sessionId) {
      setError("録音データが見つかりません。");
      return;
    }

    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 3000),
    ];

    void (async () => {
      try {
        const result = await submitEvaluation({
          sessionId: payload.sessionId,
          promptId: payload.promptId,
          attemptNumber: payload.attemptNumber,
          audioUri: payload.audioUri,
        });
        cachePracticeSession(result.session);
        removePendingRecordingPayload(payload.sessionId);

        setTimeout(() => {
          router.replace({
            pathname: "/session/[sessionId]/feedback",
            params: { sessionId: payload.sessionId },
          });
        }, 800);
      } catch (cause) {
        timers.forEach(clearTimeout);
        if (cause instanceof MobileApiError) {
          setError(cause.message);
        } else if (cause instanceof Error) {
          setError(cause.message);
        } else {
          setError("解析に失敗しました。");
        }
      }
    })();

    return () => timers.forEach(clearTimeout);
  }, [sessionId]);

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={48} color={palette.danger} />
          <Text style={styles.errorTitle}>エラーが発生しました</Text>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorAction}>
            <PrimaryButton onPress={() => router.back()}>
              録音に戻る
            </PrimaryButton>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.centered}>
        <View style={styles.spinnerCard}>
          <View style={styles.spinner}>
            <ActivityIndicator size="large" color={palette.accent} />
            <View style={styles.spinnerIcon}>
              <Ionicons name="mic" size={22} color={palette.accent} />
            </View>
          </View>

          <Text style={styles.title}>解析中です</Text>

          <View style={styles.steps}>
            {STEPS.map((label, i) => (
              <View
                key={i}
                style={[styles.stepRow, { opacity: step >= i ? 1 : 0.28 }]}
              >
                <View
                  style={[
                    styles.stepDot,
                    step > i && styles.stepDotDone,
                    step === i && styles.stepDotActive,
                  ]}
                >
                  {step > i && (
                    <Ionicons
                      name="checkmark"
                      size={10}
                      color={palette.background}
                    />
                  )}
                  {step === i && <View style={styles.stepDotPulse} />}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: step >= i ? palette.text : palette.text3 },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>
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
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 28,
    },
    spinnerCard: {
      width: "100%",
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 24,
      padding: 28,
      alignItems: "center",
    },
    spinner: {
      width: 72,
      height: 72,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 40,
    },
    spinnerIcon: {
      position: "absolute",
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 24,
      color: palette.text,
      marginBottom: 24,
      textAlign: "center",
    },
    steps: {
      width: "100%",
      gap: 12,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    stepDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepDotDone: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    stepDotActive: {
      backgroundColor: palette.accentDim,
      borderWidth: 2,
      borderColor: palette.accent,
    },
    stepDotPulse: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: palette.accent,
    },
    stepLabel: {
      fontFamily: fonts.body,
      fontSize: 13,
    },
    errorTitle: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: palette.text,
      marginTop: 16,
      marginBottom: 8,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text2,
      textAlign: "center",
      lineHeight: 20,
    },
    errorAction: {
      width: "100%",
      marginTop: 20,
    },
  });
}
