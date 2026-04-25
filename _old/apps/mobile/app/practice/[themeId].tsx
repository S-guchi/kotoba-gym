import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  formatRecordingDuration,
  getRecordingColorByState,
  recordingCharacterByState,
  shouldCleanupRecording,
  shouldShowSubmitButton,
  type RecordingCharacterVariant,
  type RecordingUiState,
} from "../../src/lib/recording-screen-helpers";
import { savePendingRecordingPayload } from "../../src/lib/pending-recording-store";
import { getPracticeSession } from "../../src/lib/storage";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../../src/lib/theme";
import type { PracticeSessionRecord } from "@kotoba-gym/core";

const characterImages: Record<RecordingCharacterVariant, number> = {
  smile: require("../../assets/images/characters/01_smile.png"),
  nod: require("../../assets/images/characters/02_nod.png"),
  thinking: require("../../assets/images/characters/03_thinking.png"),
  questioning: require("../../assets/images/characters/04_questioning.png"),
};

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
    themeId: string;
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
  const recordingStateRef = useRef<RecordingUiState>("idle");
  const isSubmittingRef = useRef(false);

  recordingStateRef.current = recordingState;
  isSubmittingRef.current = isSubmitting;

  const ensureRecordingPermission = useCallback(async () => {
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
  }, []);

  const resetRecordingUi = useCallback(() => {
    setRecordingState("idle");
    setSeconds(0);
  }, []);

  const stopRecorderSilently = useCallback(async () => {
    try {
      await recorder.stop();
    } catch {
      // 録音破棄時の stop エラーは無視する
    }
  }, [recorder]);

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const granted = await ensureRecordingPermission();
        if (!granted || !alive) return;
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      } catch {
        if (alive) {
          setSessionError("録音の準備に失敗しました。");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [ensureRecordingPermission]);

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

  useEffect(() => {
    return () => {
      if (
        shouldCleanupRecording(recordingStateRef.current) &&
        !isSubmittingRef.current
      ) {
        void stopRecorderSilently();
      }
    };
  }, [stopRecorderSilently]);

  const accentColor = getRecordingColorByState(palette)[recordingState];
  const currentCharacter =
    characterImages[recordingCharacterByState[recordingState]];

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

  if (session.evaluation) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>この練習は完了しています</Text>
          <Text style={styles.emptyBody}>
            この session
            はすでに評価済みです。フィードバック画面から確認してください。
          </Text>
          <ActionButton
            label="フィードバックを見る"
            onPress={() =>
              router.replace({
                pathname: "/session/[sessionId]/feedback",
                params: { sessionId: session.id },
              })
            }
          />
        </View>
      </SafeAreaView>
    );
  }

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
    let didStopRecording = false;

    try {
      await recorder.stop();
      didStopRecording = true;

      if (!recorder.uri) {
        throw new Error("missing recording uri");
      }

      savePendingRecordingPayload({
        sessionId: session.id,
        themeId: session.theme.id,
        audioUri: recorder.uri,
      });

      resetRecordingUi();
      setIsSubmitting(false);
      router.push({
        pathname: "/session/[sessionId]/analyzing",
        params: { sessionId: session.id },
      });
    } catch {
      setIsSubmitting(false);
      if (didStopRecording) {
        resetRecordingUi();
      } else {
        setRecordingState("paused");
      }
      Alert.alert("録音の送信に失敗しました", "もう一度お試しください。");
    }
  }

  async function resetRecording() {
    if (isSubmitting) return;

    if (shouldCleanupRecording(recordingState)) {
      await stopRecorderSilently();
    }

    resetRecordingUi();
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

  async function handleBackPress() {
    if (isSubmitting) return;

    if (shouldCleanupRecording(recordingState)) {
      await stopRecorderSilently();
      resetRecordingUi();
    }

    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.pageHeader}>
          <Pressable
            disabled={isSubmitting}
            style={styles.backBtn}
            onPress={() => void handleBackPress()}
          >
            <Ionicons name="chevron-back" size={18} color={palette.text2} />
            <Text style={styles.backText}>戻る</Text>
          </Pressable>
          <View style={styles.headerRight}>
            <Ionicons name="time-outline" size={13} color={palette.text3} />
            <Text style={styles.headerMeta}>
              目安 {session.theme.durationLabel}
            </Text>
          </View>
        </View>

        <Text style={styles.themeTitle} numberOfLines={1}>
          {session.theme.title}
        </Text>

        <View style={styles.personaSection}>
          <View
            style={[
              styles.personaCircle,
              { backgroundColor: palette.accentDim },
            ]}
          >
            <View style={styles.personaAvatarWrap}>
              <Image
                contentFit="contain"
                source={currentCharacter}
                style={styles.personaAvatar}
              />
            </View>
            <Text style={styles.personaName}>{session.theme.persona.name}</Text>
            <Text style={styles.personaDesc}>
              {session.theme.persona.description}
            </Text>
          </View>
        </View>

        <View style={styles.missionRow}>
          <Text style={styles.missionLabel}>目的</Text>
          <Text style={styles.missionText} numberOfLines={1}>
            {session.theme.mission}
          </Text>
        </View>

        <View style={styles.controlsSection}>
          {recordingState === "recording" && (
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>
                REC {formatRecordingDuration(seconds)}
              </Text>
            </View>
          )}

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
                size={recordingState === "recording" ? 22 : 32}
                color={palette.background}
              />
            </Pressable>
          </View>

          {recordingState === "idle" && (
            <Text style={styles.micLabel}>話し始める</Text>
          )}

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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 4,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    headerMeta: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
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
    themeTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: palette.text,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    personaSection: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    personaCircle: {
      width: 220,
      height: 220,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    personaAvatarWrap: {
      width: 100,
      height: 100,
      borderRadius: 999,
      backgroundColor: palette.white,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      overflow: "hidden",
    },
    personaAvatar: {
      width: 80,
      height: 80,
    },
    personaName: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: palette.text,
    },
    personaDesc: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
      marginTop: 2,
    },
    missionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      gap: 12,
    },
    missionLabel: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      color: palette.text3,
      letterSpacing: 0.6,
    },
    missionText: {
      flex: 1,
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.text,
    },
    controlsSection: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 24,
      alignItems: "center",
      gap: 8,
    },
    recBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: palette.dangerDim,
      borderWidth: 1,
      borderColor: palette.danger,
      marginBottom: 8,
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
    micButtonWrap: {
      width: 128,
      height: 128,
      alignItems: "center",
      justifyContent: "center",
    },
    micButton: {
      width: 96,
      height: 96,
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
    micLabel: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text2,
      marginTop: 4,
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
    width: 110,
    height: 110,
    borderRadius: 999,
    borderWidth: 2,
  },
});
