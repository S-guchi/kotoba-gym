import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { getSceneOption } from "@/src/lib/scenes";
import { useSession } from "@/src/lib/use-session";
import {
  Body,
  Card,
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
  Title,
} from "@/src/ui/components";
import { palette } from "@/src/ui/theme";

export default function SessionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const routeSessionId = sessionId ?? "";
  const { session, error, loading } = useSession(sessionId);

  if (loading) {
    return (
      <Screen>
        <LoadingState text="整理詳細を読み込んでいます" />
      </Screen>
    );
  }

  if (error || !session) {
    return (
      <Screen>
        <ErrorState message={error ?? "整理が見つかりません"} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Title>{session.title}</Title>
        <Body>シーン: {getSceneOption(session.scene).title}</Body>
      </View>

      {session.selectedConclusion ? (
        <Card>
          <Text selectable style={{ color: palette.accent, fontWeight: "900" }}>
            結論
          </Text>
          <Body>{session.selectedConclusion.text}</Body>
        </Card>
      ) : null}

      {session.speechPlan ? (
        <Card>
          <Text selectable style={{ color: palette.accent, fontWeight: "900" }}>
            伝える順番
          </Text>
          {session.speechPlan.steps.map((step) => (
            <Body key={step.order}>
              {step.order}. {step.title}
            </Body>
          ))}
        </Card>
      ) : null}

      {session.script ? (
        <Card>
          <Text selectable style={{ color: palette.accent, fontWeight: "900" }}>
            30秒説明
          </Text>
          <Body>{session.script.thirtySecond}</Body>
        </Card>
      ) : null}

      {session.feedback ? (
        <Card>
          <Text selectable style={{ color: palette.accent, fontWeight: "900" }}>
            フィードバック
          </Text>
          {session.feedback.positives.map((item) => (
            <Body key={item}>✓ {item}</Body>
          ))}
        </Card>
      ) : null}

      {session.script ? (
        <PrimaryButton
          onPress={() =>
            router.push({
              pathname: "/session/[sessionId]/rehearsal",
              params: { sessionId: routeSessionId },
            })
          }
        >
          もう一度練習する
        </PrimaryButton>
      ) : null}
    </Screen>
  );
}
