import type { SessionRecord } from "@kotoba-gym/core";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { fetchSessions } from "@/src/lib/api";
import { getOwnerKey } from "@/src/lib/owner-key";
import { getSceneOption } from "@/src/lib/scenes";
import { Body, Card, ErrorState, Screen, Title } from "@/src/ui/components";
import { palette } from "@/src/ui/theme";

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getOwnerKey()
        .then(fetchSessions)
        .then((items) => {
          if (active) {
            setSessions(items);
            setError(null);
          }
        })
        .catch((e) => {
          if (active) {
            setError(
              e instanceof Error ? e.message : "履歴を取得できませんでした",
            );
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <Screen>
      <Title>過去の整理</Title>
      {error ? <ErrorState message={error} /> : null}
      {sessions.length ? (
        sessions.map((session) => (
          <Pressable
            accessibilityRole="button"
            key={session.id}
            onPress={() =>
              router.push({
                pathname: "/session/[sessionId]",
                params: { sessionId: session.id },
              })
            }
          >
            <Card>
              <Text
                selectable
                style={{ color: palette.ink, fontSize: 19, fontWeight: "800" }}
              >
                {session.title}
              </Text>
              <Body>
                {getSceneOption(session.scene).title} /{" "}
                {session.feedback ? "フィードバック済み" : "整理中"}
              </Body>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card>
          <Body>まだ保存された整理はありません。</Body>
        </Card>
      )}
    </Screen>
  );
}
