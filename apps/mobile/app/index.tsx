import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { SessionRecord } from "@kotoba-gym/core";
import { fetchSessions } from "@/src/lib/api";
import { getOwnerKey } from "@/src/lib/owner-key";
import { sceneOptions } from "@/src/lib/scenes";
import { Body, Card, Hero, Screen, Title } from "@/src/ui/components";
import { palette } from "@/src/ui/theme";

export default function HomeScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getOwnerKey()
        .then(fetchSessions)
        .then((items) => {
          if (active) {
            setSessions(items);
          }
        })
        .catch(() => {
          if (active) {
            setSessions([]);
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <Screen>
      <Hero
        eyebrow="Kotoba Gym"
        title="話す前に、頭の中を整理しよう"
        body="ぐちゃぐちゃな考えを、AIと一緒に「伝わる説明」へ。最初からうまく話す必要はありません。"
      />

      <View style={{ gap: 10 }}>
        <Title>今日は何を整理しますか？</Title>
        <Body>まずは頭の中にあることを出すだけでOKです。</Body>
      </View>

      <View style={{ gap: 12 }}>
        {sceneOptions.map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option.id}
            onPress={() =>
              router.push({ pathname: "/input", params: { scene: option.id } })
            }
          >
            <Card>
              <Text
                selectable
                style={{ color: palette.ink, fontSize: 20, fontWeight: "800" }}
              >
                {option.title}
              </Text>
              <Body>{option.description}</Body>
            </Card>
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/history")}
      >
        <Card style={{ backgroundColor: "#EFE2D2" }}>
          <Text
            selectable
            style={{ color: palette.ink, fontSize: 20, fontWeight: "800" }}
          >
            最近の整理
          </Text>
          {sessions.length ? (
            sessions.slice(0, 3).map((session) => (
              <Text
                key={session.id}
                selectable
                style={{ color: palette.muted, fontSize: 16, lineHeight: 24 }}
              >
                ・{session.title}
              </Text>
            ))
          ) : (
            <Body>保存された整理はまだありません。</Body>
          )}
        </Card>
      </Pressable>
    </Screen>
  );
}
