import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Tag } from "../../src/components/tag";
import { Waveform } from "../../src/components/waveform";
import {
  coachProfile,
  formatRecordingDuration,
  getRecordingColorByState,
  recordingCharacterByState,
  recordingCharacterVariants,
  recordingDialogues,
  resolveDialogueState,
  shouldShowSubmitButton,
  type RecordingCharacterVariant,
  type RecordingUiState,
} from "../../src/lib/recording-screen-helpers";
import { savePendingRecordingPayload } from "../../src/lib/pending-recording-store";
import { getPracticeSession } from "../../src/lib/storage";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { categoryLabels, fonts, type ThemePalette } from "../../src/lib/theme";
import type { PracticeSessionRecord } from "@kotoba-gym/core";

const characterImages: Record<RecordingCharacterVariant, number> = {
  smile: require("../../assets/images/characters/01_smile.png"),
  nod: require("../../assets/images/characters/02_nod.png"),
  thinking: require("../../assets/images/characters/03_thinking.png"),
  questioning: require("../../assets/images/characters/04_questioning.png"),
};

function useTypewriterText(text: string, speed: number = 36) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let index = 0;

    const timer = setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));

      if (index >= text.length) {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [speed, text]);

  return displayed;
}

function PulseRing({ color, delay }: { color: string; delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.65, {
          duration: 1600,
          easing: Easing.out(Easing.ease),
        }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, {
          duration: 1600,
          easing: Easing.out(Easing.ease),
        }),
        -1,
        false,
      ),
    );
  }, [delay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[pulseStyles.pulseRing, { borderColor: color }, animatedStyle]}
    />
  );
}

function ActionButton({
  label,
  onPress,
  variant = "solid",
  flex = 1,
  color,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "solid" | "ghost";
  flex?: number;
  color?: string;
  disabled?: boolean;
}) {
  const palette = useThemePalette();
  const styles = createActionStyles(palette);
  const resolvedColor = color ?? palette.accent;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { flex },
        variant === "solid"
          ? { backgroundColor: resolvedColor, borderColor: resolvedColor }
          : styles.actionButtonGhost,
        disabled && styles.actionButtonDisabled,
        pressed && !disabled && styles.actionButtonPressed,
      ]}
    >
      <Text
        style={[
          styles.actionButtonLabel,
          variant === "solid"
            ? styles.actionButtonLabelSolid
            : styles.actionButtonLabelGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function PracticeScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const params = useLocalSearchParams<{
    promptId: string;
    sessionId: string;
  }>();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [session, setSession] = useState<PracticeSessionRecord | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionNotFound, setSessionNotFound] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [recordingState, setRecordingState] =
    useState<RecordingUiState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function ensureRecordingPermission() {
    const current = await AudioModule.getRecordingPermissionsAsync();
    if (current.granted) return true;

    const requested = await AudioModule.requestRecordingPermissionsAsync();
    if (!requested.granted) {
      Alert.alert(
        "マイク権限が必要です",
        "録音するにはマイクを許可してください。設定アプリから変更できます。",
      );
      return false;
    }
    return true;
  }

  useEffect(() => {
    void (async () => {
      const granted = await ensureRecordingPermission();
      if (!granted) return;
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    })();
  }, []);

  useEffect(() => {
    let alive = true;

    if (!params.sessionId) {
      setSession(null);
      setSessionNotFound(true);
      setSessionError(null);
      setIsSessionLoading(false);
      return;
    }

    setIsSessionLoading(true);
    setSession(null);
    setSessionNotFound(false);
    setSessionError(null);

    void (async () => {
      try {
        const nextSession = await getPracticeSession(params.sessionId);

        if (!alive) {
          return;
        }

        if (!nextSession) {
          setSessionNotFound(true);
          return;
        }

        setSession(nextSession);
      } catch (cause) {
        if (!alive) {
          return;
        }

        setSessionError(
          cause instanceof Error
            ? cause.message
            : "セッションを読み込めませんでした。",
        );
      } finally {
        if (alive) {
          setIsSessionLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [params.sessionId]);

  useEffect(() => {
    if (recordingState !== "recording") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(
      () => setSeconds((value) => value + 1),
      1000,
    );

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [recordingState]);

  const dialogueState = resolveDialogueState(recordingState, isSubmitting);
  const accentColor =
    dialogueState === "done"
      ? palette.accent
      : getRecordingColorByState(palette)[recordingState];
  const dialogue = recordingDialogues[dialogueState];
  const typedDialogue = useTypewriterText(dialogue);
  const statusLabel =
    recordingState === "recording"
      ? "録音中"
      : recordingState === "paused"
        ? "一時停止中"
        : "録音待機中";
  const currentCharacter =
    characterImages[recordingCharacterByState[recordingState]];
  const questionCharacter =
    characterImages[recordingCharacterVariants.questioning];

  if (isSessionLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  if (sessionError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>読み込みに失敗しました</Text>
          <Text style={styles.emptyBody}>{sessionError}</Text>
          <ActionButton
            label="ホームへ戻る"
            onPress={() => router.replace("/")}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (sessionNotFound || !session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>セッションが見つかりません</Text>
          <Text style={styles.emptyBody}>
            最新の一覧からもう一度選び直してください。
          </Text>
          <ActionButton
            label="ホームへ戻る"
            onPress={() => router.replace("/")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const currentAttempt = session.attempts.length + 1;

  async function startRecording() {
    const granted = await ensureRecordingPermission();
    if (!granted) return;

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingState("recording");
    } catch {
      Alert.alert("録音を開始できませんでした", "もう一度お試しください。");
    }
  }

  function pauseRecording() {
    try {
      recorder.pause();
      setRecordingState("paused");
    } catch {
      Alert.alert("録音を一時停止できませんでした", "もう一度お試しください。");
    }
  }

  function resumeRecording() {
    try {
      recorder.record();
      setRecordingState("recording");
    } catch {
      Alert.alert("録音を再開できませんでした", "もう一度お試しください。");
    }
  }

  async function stopAndSubmit() {
    if (!session || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await recorder.stop();

      if (!recorder.uri) {
        throw new Error("missing recording uri");
      }

      savePendingRecordingPayload({
        sessionId: session.id,
        promptId: session.prompt.id,
        attemptNumber: currentAttempt,
        audioUri: recorder.uri,
      });

      setIsSubmitting(false);
      router.push({
        pathname: "/session/[sessionId]/analyzing",
        params: { sessionId: session.id },
      });
    } catch {
      setIsSubmitting(false);
      setRecordingState("paused");
      Alert.alert("録音の送信に失敗しました", "もう一度お試しください。");
    }
  }

  async function resetRecording() {
    if (isSubmitting) return;

    try {
      if (recordingState !== "idle") {
        await recorder.stop();
      }
    } catch {
      // 録音破棄時の stop エラーは無視する
    }

    setRecordingState("idle");
    setSeconds(0);
  }

  function handleMicPress() {
    if (isSubmitting) return;

    if (recordingState === "idle") {
      void startRecording();
      return;
    }

    if (recordingState === "recording") {
      pauseRecording();
      return;
    }

    resumeRecording();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.pageHeader}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color={palette.text2} />
            <Text style={styles.backText}>戻る</Text>
          </Pressable>
          <Tag
            label={
              categoryLabels[session.prompt.category] ?? session.prompt.category
            }
          />
        </View>

        <View style={styles.heroSection}>
          <View style={[styles.heroGlow, { backgroundColor: accentColor }]} />
          <View style={styles.heroShade} />

          <View style={styles.promptPanel}>
            <Text style={styles.promptLabel}>{"TODAY'S PROMPT"}</Text>
            <Text style={styles.promptTitle}>{session.prompt.title}</Text>
            <Text style={styles.promptBody}>{session.prompt.prompt}</Text>

            {recordingState === "idle" && (
              <View style={styles.expectationCard}>
                <Image
                  contentFit="contain"
                  source={questionCharacter}
                  style={styles.expectationImage}
                />
                <View style={styles.expectationBody}>
                  <Text style={styles.expectationLabel}>相手の期待</Text>
                  <Text style={styles.expectationText}>
                    {session.prompt.situation}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.characterStage}>
            <Image
              contentFit="contain"
              source={currentCharacter}
              style={styles.characterImage}
            />
          </View>

          {recordingState === "recording" && (
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>
                REC {formatRecordingDuration(seconds)}
              </Text>
            </View>
          )}
        </View>

        <View
          style={[styles.dialogueCard, { borderTopColor: `${accentColor}66` }]}
        >
          <View style={[styles.namePlate, { borderColor: `${accentColor}55` }]}>
            <Text style={[styles.namePlateText, { color: accentColor }]}>
              {coachProfile.name}
            </Text>
            <Text style={[styles.namePlateRole, { color: `${accentColor}cc` }]}>
              {coachProfile.role}
            </Text>
          </View>

          <Text style={styles.dialogueText}>
            {typedDialogue}
            {typedDialogue.length < dialogue.length ? (
              <Text style={[styles.dialogueCursor, { color: accentColor }]}>
                ▌
              </Text>
            ) : null}
          </Text>
        </View>

        <View style={styles.controlsSection}>
          <View style={styles.timerSection}>
            <Text style={styles.timerText}>
              {formatRecordingDuration(seconds)}
            </Text>
            <Text style={styles.timerLabel}>{statusLabel}</Text>
          </View>

          <View style={styles.waveformSection}>
            {recordingState === "recording" ? (
              <Waveform color={accentColor} isRecording barCount={32} />
            ) : (
              <Text style={styles.waveformHint}>
                {recordingState === "idle"
                  ? "ボタンを押して録音を開始"
                  : "もう一度押すと録音を再開"}
              </Text>
            )}
          </View>

          <View style={styles.micButtonWrap}>
            {recordingState === "recording" && (
              <>
                <PulseRing color={accentColor} delay={0} />
                <PulseRing color={accentColor} delay={700} />
              </>
            )}
            <Pressable
              accessibilityLabel="録音操作"
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handleMicPress}
              style={({ pressed }) => [
                styles.micButton,
                {
                  backgroundColor:
                    recordingState === "recording"
                      ? palette.danger
                      : accentColor,
                  borderColor: `${accentColor}33`,
                  shadowColor:
                    recordingState === "recording"
                      ? palette.danger
                      : accentColor,
                },
                isSubmitting && styles.micButtonDisabled,
                pressed && !isSubmitting && styles.micButtonPressed,
              ]}
            >
              <Ionicons
                name={recordingState === "recording" ? "square" : "mic"}
                size={recordingState === "recording" ? 18 : 28}
                color={palette.background}
              />
            </Pressable>
          </View>

          <View style={styles.actionsRow}>
            {shouldShowSubmitButton(recordingState, seconds) ? (
              <ActionButton
                color={accentColor}
                disabled={isSubmitting}
                flex={2}
                label={isSubmitting ? "送信中..." : "回答を送信する"}
                onPress={() => void stopAndSubmit()}
              />
            ) : null}

            {recordingState !== "idle" ? (
              <ActionButton
                disabled={isSubmitting}
                flex={1}
                label="撮り直す"
                onPress={() => void resetRecording()}
                variant="ghost"
              />
            ) : null}
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
    loadingText: {
      fontFamily: fonts.body,
      color: palette.text2,
      fontSize: 14,
      textAlign: "center",
      marginTop: 40,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 16,
    },
    emptyTitle: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: palette.text,
      textAlign: "center",
    },
    emptyBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
      textAlign: "center",
    },
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    pageHeader: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 16,
      backgroundColor: palette.background,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    backText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text2,
    },
    heroSection: {
      height: "48%",
      minHeight: 340,
      overflow: "hidden",
      backgroundColor: palette.surface2,
      paddingTop: 72,
    },
    heroGlow: {
      position: "absolute",
      top: 86,
      alignSelf: "center",
      width: 280,
      height: 280,
      borderRadius: 999,
      opacity: 0.12,
    },
    heroShade: {
      position: "absolute",
      right: -30,
      top: 40,
      width: 240,
      height: 240,
      borderRadius: 999,
      backgroundColor: palette.accentWarmDim,
    },
    promptPanel: {
      width: "58%",
      paddingHorizontal: 20,
      zIndex: 2,
    },
    promptLabel: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      color: palette.accent,
      letterSpacing: 1.1,
      marginBottom: 6,
    },
    promptTitle: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: palette.text,
      lineHeight: 32,
      marginBottom: 8,
    },
    promptBody: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
      lineHeight: 20,
    },
    expectationCard: {
      marginTop: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    expectationImage: {
      width: 52,
      height: 52,
    },
    expectationBody: {
      flex: 1,
    },
    expectationLabel: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      color: palette.accentWarm,
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    expectationText: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.text,
      lineHeight: 18,
    },
    characterStage: {
      position: "absolute",
      right: -8,
      bottom: -16,
      width: "58%",
      height: "84%",
      justifyContent: "flex-end",
      alignItems: "center",
    },
    characterImage: {
      width: "100%",
      height: "100%",
    },
    recBadge: {
      position: "absolute",
      top: 84,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: palette.dangerDim,
      borderWidth: 1,
      borderColor: palette.danger,
    },
    recDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: palette.danger,
    },
    recText: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      color: palette.danger,
      letterSpacing: 0.6,
    },
    dialogueCard: {
      backgroundColor: palette.surface,
      borderTopWidth: 1,
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 16,
      minHeight: 116,
    },
    namePlate: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: palette.surface2,
      borderWidth: 1,
      marginBottom: 10,
    },
    namePlateText: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 0.5,
    },
    namePlateRole: {
      fontFamily: fonts.mono,
      fontSize: 9,
      letterSpacing: 0.5,
    },
    dialogueText: {
      minHeight: 52,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 30,
      color: palette.text,
      letterSpacing: 0.1,
    },
    dialogueCursor: {
      fontFamily: fonts.heading,
    },
    controlsSection: {
      flex: 1,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingHorizontal: 24,
      paddingTop: 18,
      paddingBottom: 24,
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: palette.background,
    },
    timerSection: {
      alignItems: "center",
    },
    timerText: {
      fontFamily: fonts.mono,
      fontSize: 40,
      color: palette.text,
      letterSpacing: -1.2,
    },
    timerLabel: {
      marginTop: 4,
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.text3,
    },
    waveformSection: {
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    waveformHint: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
      textAlign: "center",
    },
    micButtonWrap: {
      width: 112,
      height: 112,
      alignItems: "center",
      justifyContent: "center",
    },
    micButton: {
      width: 74,
      height: 74,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 8,
    },
    micButtonPressed: {
      transform: [{ scale: 0.97 }],
    },
    micButtonDisabled: {
      opacity: 0.5,
    },
    actionsRow: {
      minHeight: 52,
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
  });
}

function createActionStyles(palette: ThemePalette) {
  return StyleSheet.create({
    actionButton: {
      minHeight: 52,
      paddingHorizontal: 18,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    actionButtonGhost: {
      backgroundColor: palette.surface2,
      borderColor: palette.borderLight,
    },
    actionButtonLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      letterSpacing: -0.2,
    },
    actionButtonLabelSolid: {
      color: palette.background,
    },
    actionButtonLabelGhost: {
      color: palette.text,
    },
    actionButtonDisabled: {
      opacity: 0.45,
    },
    actionButtonPressed: {
      transform: [{ scale: 0.98 }],
    },
  });
}

const pulseStyles = StyleSheet.create({
  pulseRing: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 2,
  },
});
