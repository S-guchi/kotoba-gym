import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { PrimaryButton } from "../../src/components/primary-button";
import { Tag } from "../../src/components/tag";
import { Waveform } from "../../src/components/waveform";
import { useRecordingPayload } from "../../src/lib/recording-context";
import {
  getPracticeSession,
  toPreviousAttemptPayload,
} from "../../src/lib/storage";
import { categoryLabels, fonts, palette } from "../../src/lib/theme";
import type { PracticeSessionRecord } from "../../src/shared/practice";

export default function PracticeScreen() {
  const params = useLocalSearchParams<{
    promptId: string;
    sessionId: string;
  }>();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [session, setSession] = useState<PracticeSessionRecord | null>(null);
  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "paused"
  >("idle");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingPayload = useRecordingPayload();

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
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      if (!params.sessionId) return;
      setSession(await getPracticeSession(params.sessionId));
    })();
  }, [params.sessionId]);

  // Timer
  useEffect(() => {
    if (recordingState === "recording") {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordingState]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  const currentAttempt = session.attempts.length + 1;
  const lastAttempt = session.attempts.at(-1);

  async function startRecording() {
    const granted = await ensureRecordingPermission();
    if (!granted) return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecordingState("recording");
  }

  async function stopAndSubmit() {
    setRecordingState("paused");
    await recorder.stop();

    if (!recorder.uri || !session) return;

    // Store payload in context and navigate to analyzing screen
    recordingPayload.set({
      sessionId: session.id,
      promptId: session.prompt.id,
      attemptNumber: currentAttempt,
      audioUri: recorder.uri,
      previousAttemptSummary: lastAttempt?.evaluation.summary,
      previousEvaluation: lastAttempt
        ? toPreviousAttemptPayload(
            lastAttempt.attemptNumber,
            lastAttempt.evaluation,
          )
        : undefined,
    });

    router.push({
      pathname: "/session/[sessionId]/analyzing",
      params: { sessionId: session.id },
    });
  }

  function resetRecording() {
    setRecordingState("idle");
    setSeconds(0);
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
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

      <View style={styles.main}>
        {/* Topic summary */}
        <View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{session.prompt.title}</Text>
            <Text style={styles.summaryBody}>{session.prompt.situation}</Text>
          </View>

          {recordingState === "idle" && (
            <View style={styles.tipBanner}>
              <Text style={styles.tipText}>
                💡 結論から話すことを意識してみましょう
              </Text>
            </View>
          )}
        </View>

        {/* Recording center */}
        <View style={styles.center}>
          {/* Timer */}
          <View style={styles.timerSection}>
            <Text style={styles.timer}>{fmt(seconds)}</Text>
            <Text style={styles.timerLabel}>
              {recordingState === "recording"
                ? "録音中"
                : recordingState === "paused"
                  ? "一時停止中"
                  : "録音待機中"}
            </Text>
          </View>

          {/* Waveform */}
          <Waveform isRecording={recordingState === "recording"} />

          {/* Mic button */}
          <Pressable
            style={[
              styles.micButton,
              recordingState === "recording" && styles.micButtonRecording,
            ]}
            onPress={() => {
              if (recordingState === "idle") {
                void startRecording();
              } else if (recordingState === "recording") {
                setRecordingState("paused");
              } else {
                setRecordingState("recording");
              }
            }}
          >
            {recordingState === "recording" ? (
              <Ionicons name="square" size={22} color={palette.background} />
            ) : (
              <Ionicons name="mic" size={28} color={palette.background} />
            )}
          </Pressable>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {(recordingState === "paused" ||
            (recordingState === "recording" && seconds > 2)) && (
            <PrimaryButton onPress={() => void stopAndSubmit()}>
              回答を送信する
            </PrimaryButton>
          )}
          {recordingState !== "idle" && (
            <PrimaryButton variant="ghost" onPress={resetRecording}>
              撮り直す
            </PrimaryButton>
          )}
          {recordingState === "idle" && (
            <Text style={styles.idleHint}>ボタンを押して録音を開始</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
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
  main: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    justifyContent: "space-between",
  },
  summaryCard: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  summaryTitle: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: palette.text,
    marginBottom: 8,
  },
  summaryBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.text2,
    lineHeight: 18,
  },
  tipBanner: {
    backgroundColor: palette.accentDim,
    borderWidth: 1,
    borderColor: "rgba(110,184,154,0.2)",
    borderRadius: 10,
    padding: 12,
  },
  tipText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.accent,
    lineHeight: 18,
  },
  center: {
    alignItems: "center",
    gap: 24,
  },
  timerSection: {
    alignItems: "center",
  },
  timer: {
    fontFamily: fonts.mono,
    fontSize: 44,
    color: palette.text,
    letterSpacing: -1,
  },
  timerLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.text3,
    marginTop: 4,
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonRecording: {
    backgroundColor: palette.danger,
  },
  actions: {
    gap: 10,
  },
  idleHint: {
    fontFamily: fonts.body,
    textAlign: "center",
    fontSize: 12,
    color: palette.text3,
  },
});
