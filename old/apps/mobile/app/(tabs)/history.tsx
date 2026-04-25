import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScoreDonut } from "../../src/components/score-donut";
import { listPracticeSessions } from "../../src/lib/storage";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../../src/lib/theme";
import type { PracticeSessionRecord } from "@kotoba-gym/core";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function HistoryScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);

  useEffect(() => {
    void listPracticeSessions().then(setSessions);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        >
          <Ionicons name="chevron-back" size={18} color={palette.text2} />
          <Text style={styles.backText}>ホーム</Text>
        </Pressable>

        <View style={styles.headerSection}>
          <Text style={styles.title}>練習の記録</Text>
          <Text style={styles.subtitle}>
            これまでに作ったテーマと回答セッション
          </Text>
        </View>

        {sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>まだ履歴はありません。</Text>
            <Text style={styles.emptyBody}>
              ホームから新しいテーマを作ると、ここに練習の積み上げが残ります。
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sessions.map((session) => {
              const avgScore = session.evaluation
                ? Math.round(
                    (session.evaluation.scores.reduce(
                      (sum, item) => sum + item.score,
                      0,
                    ) /
                      session.evaluation.scores.length) *
                      20,
                  )
                : 0;

              return (
                <Pressable
                  key={session.id}
                  style={styles.historyCard}
                  onPress={() =>
                    router.push({
                      pathname: "/session/[sessionId]/feedback",
                      params: { sessionId: session.id },
                    })
                  }
                >
                  <ScoreDonut score={avgScore} size={46} />
                  <View style={styles.historyBody}>
                    <Text style={styles.historyTitle}>
                      {session.theme.title}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {session.theme.persona.name}
                    </Text>
                    <Text numberOfLines={2} style={styles.historyMission}>
                      {session.evaluation?.summary ?? session.theme.mission}
                    </Text>
                  </View>
                  <Text style={styles.historyDate}>
                    {formatDate(session.updatedAt)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.background,
    },
    scroll: {
      paddingTop: 18,
      paddingBottom: 24,
      paddingHorizontal: 20,
      gap: 16,
    },
    backBtn: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
    },
    backText: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text2,
      letterSpacing: 0.4,
    },
    headerSection: {
      gap: 4,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: palette.text,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.text3,
    },
    emptyCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 18,
      padding: 18,
      gap: 8,
    },
    emptyTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: palette.text,
    },
    emptyBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    list: {
      gap: 12,
    },
    historyCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 20,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    historyBody: {
      flex: 1,
      gap: 4,
    },
    historyTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: palette.text,
    },
    historyMeta: {
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.text3,
    },
    historyMission: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      color: palette.text2,
    },
    historyDate: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
    },
  });
}
