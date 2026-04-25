import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { getScriptModes } from "@/src/lib/session-flow";
import { useSession } from "@/src/lib/use-session";
import {
  Body,
  Card,
  Chip,
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
  Title,
} from "@/src/ui/components";
import { palette } from "@/src/ui/theme";

export default function ScriptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const routeSessionId = sessionId ?? "";
  const { session, error, loading } = useSession(sessionId);
  const [modeIndex, setModeIndex] = useState(0);

  if (loading) {
    return (
      <Screen>
        <LoadingState text="説明文を読み込んでいます" />
      </Screen>
    );
  }

  if (error || !session?.script) {
    return (
      <Screen>
        <ErrorState message={error ?? "説明文がまだありません"} />
      </Screen>
    );
  }

  const modes = getScriptModes(session.script);
  const mode = modes[modeIndex] ?? modes[0];

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Title>30秒で話すなら</Title>
        <Body>
          この文章を丸読みする必要はありません。次はキーワードを見ながら自分の言葉で話してみましょう。
        </Body>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {modes.map((item, index) => (
          <Pressable
            accessibilityRole="button"
            key={item.label}
            onPress={() => setModeIndex(index)}
            style={{
              backgroundColor:
                index === modeIndex ? palette.accent : palette.accentSoft,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                color: index === modeIndex ? "#FFFDF8" : palette.ink,
                fontWeight: "800",
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Text selectable style={{ color: palette.accent, fontWeight: "900" }}>
          {mode.label}
        </Text>
        <Text
          selectable
          style={{ color: palette.ink, fontSize: 18, lineHeight: 29 }}
        >
          {mode.value}
        </Text>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {session.script.keywords.map((keyword) => (
          <Chip key={keyword}>{keyword}</Chip>
        ))}
      </View>

      <PrimaryButton
        onPress={() =>
          router.push({
            pathname: "/session/[sessionId]/rehearsal",
            params: { sessionId: routeSessionId },
          })
        }
      >
        自分の言葉で練習する
      </PrimaryButton>
    </Screen>
  );
}
