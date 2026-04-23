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
import { useThemePalette } from "../../../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../../../src/lib/theme";
import type { PracticeSessionRecord } from "@kotoba-gym/core";

export default function FeedbackScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<PracticeSessionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    if (!sessionId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    void (async () => {
      try {
        setIsLoading(true);
        const nextSession = await getPracticeSession(sessionId);
        if (!alive) {
          return;
        }

        if (!nextSession) {
          setNotFound(true);
          return;
        }

        setSession(nextSession);
      } catch (cause) {
        if (!alive) {
          return;
        }
        setError(
          cause instanceof Error
            ? cause.message
            : "セッションを読み込めませんでした。",
        );
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  if (error || notFound || !session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyCenter}>
          <Text style={styles.loadingText}>
            {notFound
              ? "セッションが見つかりません。"
              : "読み込みに失敗しました。"}
          </Text>
          <Text style={styles.emptyText}>
            {error ?? "最新の一覧からもう一度選び直してください。"}
          </Text>
          <PrimaryButton onPress={() => router.replace("/")}>
            ホームへ戻る
          </PrimaryButton>
        </View>
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
                pathname: "/practice/[themeId]",
                params: { themeId: session.theme.id, sessionId: session.id },
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
    (eval_.scores.reduce((sum, item) => sum + item.score, 0) /
      eval_.scores.length) *
      20,
  );

  return (
    <SafeAreaView style={styles.safe}>
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
        <Text style={styles.title}>{session.theme.title}</Text>
        <Text style={styles.subtitle}>{session.theme.userInput.goal}</Text>

        <View style={styles.overallCard}>
          <ScoreDonut score={avgScore} />
          <View style={styles.overallBody}>
            <Text style={styles.summaryText}>{eval_.summary}</Text>
            <Text style={styles.missionText}>{session.theme.mission}</Text>
          </View>
        </View>

        <Collapsible title="あなたの回答（文字起こし）">
          <Text style={styles.transcriptText}>{eval_.transcript}</Text>
        </Collapsible>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>5軸スコア</Text>
          <ScoreList evaluation={eval_} />
        </View>

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

        <View style={[styles.card, styles.cardDanger]}>
          <Text style={[styles.sectionLabel, { color: palette.danger }]}>
            改善ポイント
          </Text>
          {eval_.improvementPoints.map((point) => (
            <View key={point} style={styles.pointRow}>
              <Text style={styles.arrowDanger}>→</Text>
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>

        <Collapsible title="参考になる言い換え例">
          <View style={styles.rewriteBlock}>
            <Text style={styles.transcriptText}>{eval_.exampleAnswer}</Text>
          </View>
        </Collapsible>

        <View style={[styles.card, styles.cardWarm]}>
          <Text style={styles.focusLabel}>次回の意識点</Text>
          <Text style={styles.focusText}>{eval_.nextFocus}</Text>
        </View>

        <View style={styles.actions}>
          {canRetry ? (
            <PrimaryButton
              onPress={() =>
                router.replace({
                  pathname: "/practice/[themeId]",
                  params: {
                    themeId: session.theme.id,
                    sessionId: session.id,
                  },
                })
              }
            >
              もう一度回答する
            </PrimaryButton>
          ) : null}
          {canCompare ? (
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
          ) : null}
          <PrimaryButton
            variant="ghost"
            onPress={() =>
              router.push({
                pathname: "/theme/[themeId]",
                params: { themeId: session.theme.id },
              })
            }
          >
            テーマ詳細へ戻る
          </PrimaryButton>
        </View>
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
    loadingText: {
      fontFamily: fonts.body,
      color: palette.text2,
      fontSize: 14,
      textAlign: "center",
      marginTop: 40,
    },
    emptyCenter: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: "center",
      gap: 14,
    },
    emptyText: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
      textAlign: "center",
    },
    pageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 6,
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
      fontSize: 11,
      color: palette.text3,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      gap: 12,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: palette.text,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
      marginTop: -4,
    },
    overallCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 20,
      padding: 16,
    },
    overallBody: {
      flex: 1,
      gap: 6,
    },
    summaryText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      lineHeight: 22,
      color: palette.text,
    },
    missionText: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      color: palette.text2,
    },
    card: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 20,
      padding: 16,
      gap: 8,
    },
    sectionLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: palette.text,
    },
    transcriptText: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    pointRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    pointText: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text,
    },
    cardAccent: {
      backgroundColor: palette.accentDim,
      borderColor: palette.accentDim,
    },
    cardDanger: {
      backgroundColor: palette.dangerDim,
      borderColor: palette.dangerDim,
    },
    arrowDanger: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.danger,
    },
    rewriteBlock: {
      paddingTop: 4,
    },
    cardWarm: {
      backgroundColor: palette.surface2,
      borderColor: palette.borderLight,
    },
    focusLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: palette.text,
    },
    focusText: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    actions: {
      gap: 10,
      marginTop: 4,
    },
  });
}
