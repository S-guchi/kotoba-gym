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

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const routeSessionId = sessionId ?? "";
  const { session, error, loading } = useSession(sessionId);
  const [modeIndex, setModeIndex] = useState(0);

  if (loading) {
    return (
      <Screen>
        <LoadingState text="整理結果を読み込んでいます" />
      </Screen>
    );
  }

  if (
    error ||
    !session?.materials ||
    !session.selectedConclusion ||
    !session.speechPlan ||
    !session.script
  ) {
    return (
      <Screen>
        <ErrorState message={error ?? "整理結果がまだありません"} />
      </Screen>
    );
  }

  const modes = getScriptModes(session.script);
  const mode = modes[modeIndex] ?? modes[0];

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Title>整理できました</Title>
        <Body>まずはこの内容を見ながら、自分の言葉で話してみましょう。</Body>
      </View>

      <Card>
        <Text selectable style={{ color: palette.accent, fontWeight: "900" }}>
          一番伝えたいこと
        </Text>
        <Text
          selectable
          style={{ color: palette.ink, fontSize: 21, fontWeight: "900" }}
        >
          {session.selectedConclusion.text}
        </Text>
      </Card>

      <Card>
        <Text selectable style={{ color: palette.accent, fontWeight: "900" }}>
          30秒で話すなら
        </Text>
        {modes.length > 1 ? (
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
        ) : null}
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

      <Card>
        <Text selectable style={{ color: palette.accent, fontWeight: "900" }}>
          話の材料
        </Text>
        {session.materials.items.map((item) => (
          <View key={item.key} style={{ gap: 4 }}>
            <Text selectable style={{ color: palette.ink, fontWeight: "900" }}>
              {item.title}
            </Text>
            <Body>{item.content || item.placeholder || "まだ未整理です"}</Body>
          </View>
        ))}
      </Card>

      <Card>
        <Text selectable style={{ color: palette.accent, fontWeight: "900" }}>
          伝える順番
        </Text>
        {session.speechPlan.steps.map((step) => (
          <View key={step.order} style={{ gap: 4 }}>
            <Text selectable style={{ color: palette.ink, fontWeight: "900" }}>
              {step.order}. {step.title}
            </Text>
            <Body>{step.content}</Body>
          </View>
        ))}
      </Card>

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
