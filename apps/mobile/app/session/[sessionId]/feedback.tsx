import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Collapsible } from "../../../src/components/collapsible";
import { PrimaryButton } from "../../../src/components/primary-button";
import { ScoreDonut } from "../../../src/components/score-donut";
import { ScoreList } from "../../../src/components/score-list";
import { getPracticeSession } from "../../../src/lib/storage";
import { fonts, palette } from "../../../src/lib/theme";
import type { PracticeSessionRecord } from "../../../src/shared/practice";

export default function FeedbackScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<PracticeSessionRecord | null>(null);

  useEffect(() => {
    void (async () => {
      if (!sessionId) return;
      setSession(await getPracticeSession(sessionId));
    })();
  }, [sessionId]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  const latestAttempt = session.attempts.at(-1);
  if (!latestAttempt) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyCenter}>
          <Text style={styles.loadingText}>まだ回答がありません。</Text>
          <PrimaryButton
            onPress={() =>
              router.replace({
                pathname: "/practice/[promptId]",
                params: { promptId: session.prompt.id, sessionId: session.id },
              })
            }
          >
            録音に進む
          </PrimaryButton>
        </View>
      </SafeAreaView>
    );
  }

  const canRetry = session.attempts.length === 1;
  const canCompare = session.attempts.length >= 2;
  const eval_ = latestAttempt.evaluation;
  const avgScore = Math.round(
    eval_.scores.reduce((s, x) => s + x.score, 0) / eval_.scores.length * 20,
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <Pressable style={styles.backBtn} onPress={() => router.replace("/")}>
          <Ionicons name="chevron-back" size={18} color={palette.text2} />
          <Text style={styles.backText}>ホーム</Text>
        </Pressable>
        <Text style={styles.attemptLabel}>
          Attempt {latestAttempt.attemptNumber}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>{session.prompt.title}</Text>
        <Text style={styles.subtitle}>フィードバック</Text>

        {/* Overall score */}
        <View style={styles.overallCard}>
          <ScoreDonut score={avgScore} />
          <Text style={styles.summaryText}>{eval_.summary}</Text>
        </View>

        {/* Transcript */}
        <Collapsible title="あなたの回答（文字起こし）">
          <Text style={styles.transcriptText}>{eval_.transcript}</Text>
        </Collapsible>

        {/* 5-axis scores */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>5軸スコア</Text>
          <ScoreList evaluation={eval_} />
        </View>

        {/* Good points */}
        <View style={[styles.card, styles.cardAccent]}>
          <Text style={[styles.sectionLabel, { color: palette.accent }]}>
            良かった点
          </Text>
          {eval_.goodPoints.map((point) => (
            <View key={point} style={styles.pointRow}>
              <Ionicons name="checkmark" size={14} color={palette.accent} />
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>

        {/* Improvement points */}
        <View style={[styles.card, styles.cardDanger]}>
          <Text style={[styles.sectionLabel, { color: palette.danger }]}>
            改善ポイント
          </Text>
          {eval_.improvementPoints.map((point) => (
            <View key={point} style={styles.pointRow}>
              <Text style={{ color: palette.danger, fontSize: 14 }}>→</Text>
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>

        {/* Rewrite example */}
        <Collapsible title="参考になる言い換え例">
          <View style={styles.rewriteBlock}>
            <Text style={styles.transcriptText}>{eval_.exampleAnswer}</Text>
          </View>
        </Collapsible>

        {/* Next focus */}
        <View style={[styles.card, styles.cardWarm]}>
          <Text style={styles.focusLabel}>次回の意識点</Text>
          <Text style={styles.focusText}>{eval_.nextFocus}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {canRetry && (
            <PrimaryButton
              onPress={() =>
                router.replace({
                  pathname: "/practice/[promptId]",
                  params: {
                    promptId: session.prompt.id,
                    sessionId: session.id,
                  },
                })
              }
            >
              もう一度回答する
            </PrimaryButton>
          )}
          {canCompare && (
            <PrimaryButton
              variant="ghost"
              onPress={() =>
                router.push({
                  pathname: "/session/[sessionId]/comparison",
                  params: { sessionId: session.id },
                })
              }
            >
              比較を見る
            </PrimaryButton>
          )}
          <PrimaryButton variant="ghost" onPress={() => router.replace("/")}>
            ホームへ戻る
          </PrimaryButton>
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
  loadingText: {
    fontFamily: fonts.body,
    color: palette.text2,
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
  emptyCenter: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    gap: 16,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.text2,
  },
  attemptLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: palette.text3,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 14,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: palette.text,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: palette.text3,
    marginBottom: 4,
  },
  overallCard: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  summaryText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.text2,
    lineHeight: 20,
    flex: 1,
  },
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 14,
  },
  cardAccent: {
    backgroundColor: palette.accentDim,
    borderColor: "rgba(110,184,154,0.2)",
  },
  cardDanger: {
    backgroundColor: palette.dangerDim,
    borderColor: "rgba(196,122,107,0.2)",
  },
  cardWarm: {
    backgroundColor: palette.accentWarmDim,
    borderColor: "rgba(196,164,107,0.25)",
  },
  sectionLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: palette.text3,
    marginBottom: 10,
  },
  pointRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
    alignItems: "flex-start",
  },
  pointText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.text,
    lineHeight: 20,
    flex: 1,
  },
  transcriptText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.text2,
    lineHeight: 22,
  },
  rewriteBlock: {
    borderLeftWidth: 2,
    borderLeftColor: palette.accent,
    paddingLeft: 12,
  },
  focusLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    fontWeight: "500",
    color: palette.accentWarm,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  focusText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.text,
    lineHeight: 22,
  },
  actions: {
    gap: 10,
    marginTop: 10,
  },
});
