import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { createSession, transcribeAudio } from "@/src/lib/api";
import { getOwnerKey } from "@/src/lib/owner-key";
import {
  buildSessionTitle,
  getHomeRecordingMessage,
  hasDraftInput,
} from "@/src/lib/session-flow";
import { ErrorState, PrimaryButton, Screen } from "@/src/ui/components";
import { palette } from "@/src/ui/theme";

export default function HomeScreen() {
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const hasInput = hasDraftInput(text);
  const recordingMessage = getHomeRecordingMessage({
    hasRecordedAudio: Boolean(recordedUri),
    isRecording: recorderState.isRecording,
    isTranscribing: transcribing,
  });

  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync().then((status) => {
      if (status.granted) {
        setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      } else {
        Alert.alert(
          "マイク権限が必要です",
          "音声で雑入力するにはマイク権限が必要です。テキスト入力だけでも整理できます。",
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
        rawInput: text,
        title: buildSessionTitle(text),
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
      <View>
        {recordingMessage ? (
          <Text
            accessibilityLiveRegion="polite"
            selectable
            style={{
              color: palette.muted,
              fontSize: 15,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {recordingMessage}
          </Text>
        ) : null}
      </View>

      <View>
        <TextInput
          multiline
          onChangeText={setText}
          placeholder="話しても、書いてもOK"
          placeholderTextColor="#A08F7A"
          style={{
            backgroundColor: palette.panel,
            borderColor: palette.line,
            borderRadius: 24,
            borderWidth: 1,
            color: palette.ink,
            fontSize: 18,
            lineHeight: 28,
            minHeight: 260,
            padding: 18,
            paddingRight: hasInput ? 54 : 18,
            textAlignVertical: "top",
          }}
          value={text}
        />
        {hasInput ? (
          <Pressable
            accessibilityLabel="テキストを消す"
            accessibilityRole="button"
            onPress={() => setText("")}
            style={{
              alignItems: "center",
              height: 40,
              justifyContent: "center",
              position: "absolute",
              right: 10,
              top: 10,
              width: 40,
            }}
          >
            <MaterialIcons color={palette.muted} name="close" size={24} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityLabel={recorderState.isRecording ? "録音を停止" : "音声で話す"}
        accessibilityRole="button"
        disabled={transcribing}
        onPress={recorderState.isRecording ? stopRecording : startRecording}
        style={{
          alignItems: "center",
          alignSelf: "center",
          backgroundColor: transcribing
            ? palette.line
            : recorderState.isRecording
              ? "#E05050"
              : palette.accent,
          borderRadius: 999,
          height: 64,
          justifyContent: "center",
          width: 64,
        }}
      >
        {transcribing ? (
          <Text style={{ color: "#FFFDF8", fontSize: 13, fontWeight: "800" }}>
            変換中
          </Text>
        ) : (
          <MaterialIcons
            color="#FFFDF8"
            name={recorderState.isRecording ? "stop" : "mic"}
            size={32}
          />
        )}
      </Pressable>

      {error ? <ErrorState message={error} /> : null}

      <PrimaryButton
        disabled={!hasInput || submitting || transcribing}
        onPress={handleSubmit}
      >
        {submitting ? "送信中..." : "整理する"}
      </PrimaryButton>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/history")}
        style={{ alignItems: "center", paddingVertical: 8 }}
      >
        <Text style={{ color: palette.muted, fontSize: 15, fontWeight: "700" }}>
          過去の整理を見る
        </Text>
      </Pressable>
    </Screen>
  );
}
