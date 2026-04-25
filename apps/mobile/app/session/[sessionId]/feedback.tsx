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
  SecondaryButton,
  Title,
} from "@/src/ui/components";
import { palette } from "@/src/ui/theme";

export default function FeedbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const routeSessionId = sessionId ?? "";
  const { session, error, loading } = useSession(sessionId);

  if (loading) {
    return (
      <Screen>
        <LoadingState text="フィードバックを読み込んでいます" />
      </Screen>
    );
  }

  if (error || !session?.feedback) {
    return (
      <Screen>
        <ErrorState message={error ?? "フィードバックがまだありません"} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Title>今回の整理度レビュー</Title>
        <Body>話し方の採点ではなく、説明の組み立てを振り返ります。</Body>
      </View>

      <Card>
        <Text
          selectable
          style={{ color: palette.moss, fontSize: 19, fontWeight: "900" }}
        >
          良かった点
        </Text>
        {session.feedback.positives.map((item) => (
          <Body key={item}>✓ {item}</Body>
        ))}
      </Card>

      <Card>
        <Text
          selectable
          style={{ color: palette.accent, fontSize: 19, fontWeight: "900" }}
        >
          改善するともっと伝わる点
        </Text>
        {session.feedback.improvements.map((item) => (
          <Body key={item}>・{item}</Body>
        ))}
      </Card>

      <Card>
        <Text
          selectable
          style={{ color: palette.ink, fontSize: 19, fontWeight: "900" }}
        >
          次の一言
        </Text>
        <Text
          selectable
          style={{ color: palette.ink, fontSize: 18, lineHeight: 28 }}
        >
          「{session.feedback.nextPhrase}」
        </Text>
      </Card>

      <Card>
        <Text
          selectable
          style={{ color: palette.ink, fontSize: 19, fontWeight: "900" }}
        >
          Before / After
        </Text>
        <Body>最初: {session.feedback.before}</Body>
        <Body>整理後: {session.feedback.after}</Body>
      </Card>

      <PrimaryButton
        onPress={() =>
          router.push({
            pathname: "/session/[sessionId]/saved",
            params: { sessionId: routeSessionId },
          })
        }
      >
        整理内容を保存
      </PrimaryButton>
      <SecondaryButton
        onPress={() =>
          router.push({
            pathname: "/session/[sessionId]/rehearsal",
            params: { sessionId: routeSessionId },
          })
        }
      >
        もう一度話す
      </SecondaryButton>
    </Screen>
  );
}
