import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { AppShell, Card, SectionTitle } from "../../src/components/app-shell";
import { PrimaryButton } from "../../src/components/primary-button";
import { MobileApiError, submitEvaluation } from "../../src/lib/api";
import {
  appendAttemptToSession,
  getPracticeSession,
  toPreviousAttemptPayload,
} from "../../src/lib/storage";
import { palette } from "../../src/lib/theme";
import type { PracticeSessionRecord } from "../../src/shared/practice";

export default function PracticeScreen() {
  const params = useLocalSearchParams<{
    promptId: string;
    sessionId: string;
  }>();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [session, setSession] = useState<PracticeSessionRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionReady, setPermissionReady] = useState(false);

  async function ensureRecordingPermission() {
    const current = await AudioModule.getRecordingPermissionsAsync();
    if (current.granted) {
      return true;
    }

    const requested = await AudioModule.requestRecordingPermissionsAsync();
    if (!requested.granted) {
      setPermissionReady(false);
      setError(
        "マイク権限がないため録音できません。iPhoneの設定から許可してください。",
      );
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
      if (!granted) {
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      setPermissionReady(true);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      if (!params.sessionId) {
        return;
      }
      const loaded = await getPracticeSession(params.sessionId);
      setSession(loaded);
    })();
  }, [params.sessionId]);

  if (!params.sessionId || !session) {
    return (
      <AppShell title="録音" subtitle="セッションを準備しています。">
        <Card>
          <Text style={styles.text}>読み込み中...</Text>
        </Card>
      </AppShell>
    );
  }

  const activeSession = session;
  const currentAttempt = activeSession.attempts.length + 1;
  const lastAttempt = activeSession.attempts.at(-1);
  const canRetry = currentAttempt <= 2;

  async function startRecording() {
    setError(null);

    const granted = await ensureRecordingPermission();
    if (!granted) {
      return;
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    setPermissionReady(true);
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function stopRecording() {
    if (!canRetry) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await recorder.stop();
      if (!recorder.uri) {
        throw new Error("録音ファイルの取得に失敗しました。");
      }

      const response = await submitEvaluation({
        promptId: activeSession.prompt.id,
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

      const updated = await appendAttemptToSession({
        sessionId: activeSession.id,
        attemptNumber: response.attemptNumber,
        evaluation: response.evaluation,
      });
      setSession(updated);
      router.push({
        pathname: "/session/[sessionId]/feedback",
        params: { sessionId: activeSession.id },
      });
    } catch (cause) {
      if (cause instanceof MobileApiError) {
        setError(cause.message);
      } else if (cause instanceof Error) {
        setError(cause.message);
      } else {
        setError("録音の送信に失敗しました。");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="録音"
      subtitle={`Attempt ${Math.min(currentAttempt, 2)} / 2`}
      right={
        <PrimaryButton variant="ghost" onPress={() => router.replace("/")}>
          ホーム
        </PrimaryButton>
      }
    >
      <Card tone="accent">
        <Text style={styles.promptTitle}>{session.prompt.title}</Text>
        <Text style={styles.promptBody}>{activeSession.prompt.prompt}</Text>
        <Text style={styles.promptSituation}>
          {activeSession.prompt.situation}
        </Text>
      </Card>

      <Card>
        <SectionTitle>今回の狙い</SectionTitle>
        {activeSession.prompt.goals.map((goal) => (
          <Text key={goal} style={styles.bullet}>
            ・{goal}
          </Text>
        ))}
      </Card>

      {lastAttempt ? (
        <Card>
          <SectionTitle>前回の総評</SectionTitle>
          <Text style={styles.text}>{lastAttempt.evaluation.summary}</Text>
          <Text style={styles.focus}>
            次回の意識点: {lastAttempt.evaluation.nextFocus}
          </Text>
        </Card>
      ) : null}

      {error ? (
        <Card tone="warning">
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      <Card>
        <SectionTitle>録音操作</SectionTitle>
        <Text style={styles.status}>
          {recorderState.isRecording
            ? "録音中です。話し終わったら停止してください。"
            : permissionReady
              ? "ボタンを押して録音を開始します。"
              : "初回のみマイク権限の確認が入ります。"}
        </Text>
        <View style={styles.actions}>
          <PrimaryButton
            disabled={submitting || recorderState.isRecording || !canRetry}
            onPress={() => {
              void startRecording();
            }}
          >
            録音開始
          </PrimaryButton>
          <PrimaryButton
            variant="ghost"
            disabled={submitting || !recorderState.isRecording}
            onPress={() => {
              void stopRecording();
            }}
          >
            録音停止して送信
          </PrimaryButton>
        </View>
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  promptTitle: {
    color: palette.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
  },
  promptBody: {
    color: palette.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  promptSituation: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  bullet: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  text: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  focus: {
    color: palette.accent,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  status: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
  },
  error: {
    color: palette.warning,
    fontSize: 14,
    fontWeight: "700",
  },
});
