import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File } from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { transcribeAudio } from "@/src/lib/api";
import { buildRehearsalResult, formatDuration } from "@/src/lib/session-flow";
import { updateSession } from "@/src/lib/session-store";
import { useSession } from "@/src/lib/use-session";
import {
  Body,
  Card,
  Chip,
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Title,
} from "@/src/ui/components";
import { palette } from "@/src/ui/theme";

export default function RehearsalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const routeSessionId = sessionId ?? "";
  const { session, ownerKey, error, loading } = useSession(sessionId);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [seconds, setSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);

  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync().then((status) => {
      if (status.granted) {
        setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      } else {
        Alert.alert(
          "マイク権限が必要です",
          "リハーサル録音にマイクを使います。",
        );
      }
    });
  }, []);

  useEffect(() => {
    if (!recorderState.isRecording) {
      return;
    }

    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [recorderState.isRecording]);

  async function startRecording() {
    setSeconds(0);
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  function getAudioMimeType(uri: string) {
    if (uri.endsWith(".webm")) {
      return "audio/webm";
    }
    if (uri.endsWith(".3gp")) {
      return "audio/3gpp";
    }
    if (uri.endsWith(".caf")) {
      return "audio/x-caf";
    }
    return "audio/mp4";
  }

  async function stopRecording() {
    if (!ownerKey || !sessionId) {
      return;
    }

    setTranscribing(true);
    try {
      await recorder.stop();
      const uri = recorder.uri ?? recorder.getStatus().url;
      if (!uri) {
        throw new Error("録音ファイルを取得できませんでした");
      }
      const file = new File(uri);
      const transcript = await transcribeAudio({
        audioBase64: await file.base64(),
        mimeType: getAudioMimeType(uri),
      });
      const rehearsal = buildRehearsalResult({
        durationSeconds: seconds,
        spokenText: transcript.text,
      });
      await updateSession(sessionId, { ownerKey, rehearsal });
      router.replace({
        pathname: "/session/[sessionId]/organizing",
        params: { sessionId, step: "feedback" },
      });
    } catch (e) {
      Alert.alert(
        "文字起こしに失敗しました",
        e instanceof Error ? e.message : "録音内容を確認できませんでした。",
      );
    } finally {
      setTranscribing(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState text="リハーサルを準備しています" />
      </Screen>
    );
  }

  if (error || !session?.script) {
    return (
      <Screen>
        <ErrorState message={error ?? "練習用の説明文がまだありません"} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Title>30秒で話してみましょう</Title>
        <Body>
          丸読みしなくてOKです。キーワードを見ながら、自分の言葉で話してください。
        </Body>
      </View>

      <Card style={{ alignItems: "center", padding: 28 }}>
        <Text
          selectable
          style={{
            color: palette.ink,
            fontSize: 48,
            fontWeight: "900",
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatDuration(seconds)}
        </Text>
        <Body>
          {recorderState.isRecording
            ? "録音中..."
            : "完璧に話す必要はありません。"}
        </Body>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {session.script.keywords.map((keyword) => (
          <Chip key={keyword}>{keyword}</Chip>
        ))}
      </View>

      {recorderState.isRecording ? (
        <PrimaryButton disabled={transcribing} onPress={stopRecording}>
          {transcribing ? "文字起こし中..." : "停止してフィードバックへ"}
        </PrimaryButton>
      ) : (
        <PrimaryButton disabled={transcribing} onPress={startRecording}>
          録音開始
        </PrimaryButton>
      )}
      <SecondaryButton
        onPress={() =>
          router.push({
            pathname: "/session/[sessionId]/result",
            params: { sessionId: routeSessionId },
          })
        }
      >
        整理結果に戻る
      </SecondaryButton>
    </Screen>
  );
}
