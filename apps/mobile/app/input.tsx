import type { Scene } from "@kotoba-gym/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { createSession } from "@/src/lib/api";
import { getOwnerKey } from "@/src/lib/owner-key";
import { getSceneOption } from "@/src/lib/scenes";
import {
  buildSessionTitle,
  getInputSupportMessage,
} from "@/src/lib/session-flow";
import {
  Body,
  Card,
  ErrorState,
  PrimaryButton,
  Screen,
  Title,
} from "@/src/ui/components";
import { palette } from "@/src/ui/theme";

export default function InputScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scene?: Scene }>();
  const scene = params.scene ?? "free";
  const sceneOption = getSceneOption(scene);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const supportMessage = getInputSupportMessage(text);

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
        <Title>思いついた順でOKです</Title>
        <Body>
          {sceneOption.title}を整理します。うまく話そうとしなくて大丈夫です。
        </Body>
      </View>

      <TextInput
        multiline
        onChangeText={setText}
        placeholder="今度の会議でCI導入について相談したい。今は手動でruffとpytestを回していて..."
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
        disabled={!text.trim() || submitting}
        onPress={handleSubmit}
      >
        {submitting ? "送信中..." : "整理する"}
      </PrimaryButton>
    </Screen>
  );
}
