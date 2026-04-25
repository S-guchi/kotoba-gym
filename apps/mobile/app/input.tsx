import type { Scene } from "@kotoba-gym/core";
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
import { Alert, Text, TextInput, View } from "react-native";
import { createSession, transcribeAudio } from "@/src/lib/api";
import { getOwnerKey } from "@/src/lib/owner-key";
import { getSceneOption } from "@/src/lib/scenes";
import {
  buildSessionTitle,
  formatDuration,
  getInputSupportMessage,
} from "@/src/lib/session-flow";
import {
  Body,
  Card,
  ErrorState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Title,
} from "@/src/ui/components";
import { palette } from "@/src/ui/theme";

export default function InputScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scene?: Scene }>();
  const scene = params.scene ?? "free";
  const sceneOption = getSceneOption(scene);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const supportMessage = getInputSupportMessage(text);

  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync().then((status) => {
      if (status.granted) {
        setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      } else {
        Alert.alert(
          "マイク権限が必要です",
          "最初の雑入力では、思いついたことを音声で出せるようにします。",
        );
      }
    });
  }, []);

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

  async function startRecording() {
    setError(null);
    setText("");
    setRecordedUri(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function stopRecording() {
    setError(null);
    setTranscribing(true);
    try {
      await recorder.stop();
      const uri = recorder.uri ?? recorder.getStatus().url;
      if (!uri) {
        throw new Error("録音ファイルを取得できませんでした");
      }
      setRecordedUri(uri);
      const file = new File(uri);
      const result = await transcribeAudio({
        audioBase64: await file.base64(),
        mimeType: getAudioMimeType(uri),
      });
      setText(result.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "文字起こしに失敗しました");
    } finally {
      setTranscribing(false);
    }
  }

  async function handleSubmit() {
    if (!text.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const ownerKey = await getOwnerKey();
      const session = await createSession({
        ownerKey,
        scene,
        rawInput: text,
        title: buildSessionTitle(scene, text),
      });
      router.replace({
        pathname: "/session/[sessionId]/organizing",
        params: { sessionId: session.id, step: "organize" },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Title>思いついた順で話してください</Title>
        <Body>
          {sceneOption.title}
          を整理します。途中で止まっても大丈夫です。録音後に文字起こしを直せます。
        </Body>
      </View>

      <Card style={{ alignItems: "center", padding: 28 }}>
        <Text
          selectable
          style={{
            color: palette.ink,
            fontSize: 46,
            fontVariant: ["tabular-nums"],
            fontWeight: "900",
          }}
        >
          {formatDuration(Math.floor(recorderState.durationMillis / 1000))}
        </Text>
        <Body>
          {recorderState.isRecording
            ? "録音中です。詰まってもそのままでOKです。"
            : recordedUri
              ? "録音できました。文字起こしを確認してください。"
              : "まずは音声で、頭に浮かんでいることをそのまま出してください。"}
        </Body>
        {recorderState.isRecording ? (
          <PrimaryButton onPress={stopRecording}>
            停止して文字起こし
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled={transcribing} onPress={startRecording}>
            {transcribing ? "文字起こし中..." : "音声で話す"}
          </PrimaryButton>
        )}
      </Card>

      <TextInput
        multiline
        onChangeText={setText}
        placeholder="文字起こし結果がここに入ります。テキストで直接書くこともできます。"
        placeholderTextColor="#A08F7A"
        style={{
          backgroundColor: palette.panel,
          borderColor: palette.line,
          borderRadius: 24,
          borderWidth: 1,
          color: palette.ink,
          fontSize: 17,
          lineHeight: 26,
          minHeight: 220,
          padding: 18,
          textAlignVertical: "top",
        }}
        value={text}
      />

      {supportMessage ? (
        <Card>
          <Text selectable style={{ color: palette.ink, fontWeight: "800" }}>
            困ったら、下の質問に答えてみてください。
          </Text>
          <Body>{supportMessage}</Body>
          <Body>
            ・何に困っていますか？{"\n"}・誰に伝えたいですか？{"\n"}
            ・相手に何をしてほしいですか？
          </Body>
        </Card>
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      <PrimaryButton
        disabled={!text.trim() || submitting || transcribing}
        onPress={handleSubmit}
      >
        {submitting ? "送信中..." : "整理する"}
      </PrimaryButton>
      <SecondaryButton onPress={() => setText("")}>
        テキストを消す
      </SecondaryButton>
    </Screen>
  );
}
