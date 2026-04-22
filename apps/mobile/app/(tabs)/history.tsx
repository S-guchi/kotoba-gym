import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScoreDonut } from "../../src/components/score-donut";
import { Tag } from "../../src/components/tag";
import { listPracticeSessions } from "../../src/lib/storage";
import { categoryLabels, fonts, palette } from "../../src/lib/theme";
import type { PracticeSessionRecord } from "../../src/shared/practice";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);

  useEffect(() => {
    void listPracticeSessions().then(setSessions);
  }, []);

  // Trend stats
  const weekCount = sessions.length;
  const bestAxis = "—"; // simplified

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>練習の記録</Text>
          <Text style={styles.subtitle}>あなたの積み上げ</Text>
        </View>

        {/* Trend strip */}
        <View style={styles.trendGrid}>
          <View style={styles.trendCard}>
            <Text style={styles.trendValue}>{weekCount}回</Text>
            <Text style={styles.trendLabel}>今週の練習</Text>
          </View>
          <View style={styles.trendCard}>
            <Text style={styles.trendValue}>{bestAxis}</Text>
            <Text style={styles.trendLabel}>最近伸びた軸</Text>
          </View>
        </View>

        {/* History list */}
        <Text style={styles.sectionLabel}>履歴</Text>

        {sessions.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>まだ履歴はありません。</Text>
          </View>
        )}

        <View style={styles.list}>
          {sessions.map((session) => {
            const latest = session.attempts.at(-1);
            const avgScore = latest
              ? Math.round(
                  latest.evaluation.scores.reduce((s, x) => s + x.score, 0) /
                    latest.evaluation.scores.length *
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
                <ScoreDonut score={avgScore} size={44} />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {session.prompt.title}
                  </Text>
                  <View style={styles.historyMeta}>
                    <Tag
                      label={
                        categoryLabels[session.prompt.category] ??
                        session.prompt.category
                      }
                    />
                    <Text style={styles.historyAttempts}>
                      ×{session.attempts.length}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyDate}>
                  {formatDate(session.updatedAt)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  headerSection: {
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: palette.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.text3,
  },
  trendGrid: {
    flexDirection: "row",
    gap: 10,
  },
  trendCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 12,
  },
  trendValue: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: palette.accent,
    marginBottom: 2,
  },
  trendLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.text3,
  },
  sectionLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: palette.text3,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 16,
  },
  emptyText: {
    fontFamily: fonts.body,
    color: palette.text2,
    fontSize: 14,
  },
  list: {
    gap: 10,
  },
  historyCard: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyInfo: {
    flex: 1,
    gap: 4,
  },
  historyTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: palette.text,
    fontWeight: "500",
  },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyAttempts: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: palette.text3,
  },
  historyDate: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: palette.text3,
  },
});
