import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
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

export default function SpeechPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const routeSessionId = sessionId ?? "";
  const { session, error, loading } = useSession(sessionId);

  if (loading) {
    return (
      <Screen>
        <LoadingState text="伝える順番を読み込んでいます" />
      </Screen>
    );
  }

  if (error || !session?.speechPlan) {
    return (
      <Screen>
        <ErrorState message={error ?? "伝える順番がまだありません"} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Title>{session.speechPlan.title}</Title>
        <Body>{session.speechPlan.lead}</Body>
      </View>

      {session.speechPlan.steps.map((step) => (
        <Card key={step.order}>
          <Text selectable style={{ color: palette.accent, fontWeight: "900" }}>
            {step.order}. {step.title}
          </Text>
          <Text
            selectable
            style={{ color: palette.ink, fontSize: 17, lineHeight: 25 }}
          >
            {step.content}
          </Text>
          {step.reason ? <Body>{step.reason}</Body> : null}
        </Card>
      ))}

      <PrimaryButton
        onPress={() =>
          router.push({
            pathname: "/session/[sessionId]/organizing",
            params: { sessionId: routeSessionId, step: "script" },
          })
        }
      >
        この順番で進める
      </PrimaryButton>
    </Screen>
  );
}
