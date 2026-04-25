import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "react-native";
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

export default function SavedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const routeSessionId = sessionId ?? "";
  const { session, error, loading } = useSession(sessionId);

  if (loading) {
    return (
      <Screen>
        <LoadingState text="保存内容を読み込んでいます" />
      </Screen>
    );
  }

  if (error || !session) {
    return (
      <Screen>
        <ErrorState message={error ?? "保存内容が見つかりません"} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>保存しました</Title>
      <Card>
        <Text
          selectable
          style={{ color: palette.ink, fontSize: 20, fontWeight: "900" }}
        >
          {session.title}
        </Text>
        <Body>
          ✓ 話の材料を分けた{"\n"}✓ 結論を決めた{"\n"}✓ 30秒で説明した
        </Body>
      </Card>
      <PrimaryButton onPress={() => router.replace("/")}>
        ホームに戻る
      </PrimaryButton>
      <SecondaryButton
        onPress={() =>
          router.push({
            pathname: "/session/[sessionId]/rehearsal",
            params: { sessionId: routeSessionId },
          })
        }
      >
        もう一度練習する
      </SecondaryButton>
    </Screen>
  );
}
