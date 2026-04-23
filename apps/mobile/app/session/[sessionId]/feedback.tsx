import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Collapsible } from "../../../src/components/collapsible";
import { PrimaryButton } from "../../../src/components/primary-button";
import { ScoreDonut } from "../../../src/components/score-donut";
import { ScoreList } from "../../../src/components/score-list";
import {
  createPracticeSession,
  getPracticeSession,
} from "../../../src/lib/storage";
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
  const [isRestarting, setIsRestarting] = useState(false);

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

  async function handleRetry() {
    if (!session || isRestarting) {
      return;
    }

    setIsRestarting(true);

    try {
      const nextSession = await createPracticeSession(session.theme);
      router.replace({
        pathname: "/practice/[themeId]",
        params: { themeId: session.theme.id, sessionId: nextSession.id },
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "新しい練習を開始できませんでした。",
      );
      setIsRestarting(false);
    }
  }

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

  if (!session.evaluation) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyCenter}>
          <Text style={styles.loadingText}>まだ評価がありません。</Text>
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

  const evaluation = session.evaluation;
  const canCompare = evaluation.comparison != null;
  const avgScore = Math.round(
    (evaluation.scores.reduce((sum, item) => sum + item.score, 0) /
      evaluation.scores.length) *
      20,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.pageHeader}>
        <Pressable style={styles.backBtn} onPress={() => router.replace("/")}>
          <Ionicons name="chevron-back" size={18} color={palette.text2} />
          <Text style={styles.backText}>ホーム</Text>
        </Pressable>
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
            <Text style={styles.summaryText}>{evaluation.summary}</Text>
            <Text style={styles.missionText}>{session.theme.mission}</Text>
          </View>
        </View>

        <Collapsible title="あなたの回答（文字起こし）">
          <Text style={styles.transcriptText}>{evaluation.transcript}</Text>
        </Collapsible>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>5軸スコア</Text>
          <ScoreList evaluation={evaluation} />
        </View>

        <View style={[styles.card, styles.cardAccent]}>
          <Text style={[styles.sectionLabel, { color: palette.accent }]}>
            良かった点
          </Text>
          {evaluation.goodPoints.map((point) => (
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
          {evaluation.improvementPoints.map((point) => (
            <View key={point} style={styles.pointRow}>
              <Text style={styles.arrowDanger}>→</Text>
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>

        <Collapsible title="参考になる言い換え例">
          <View style={styles.rewriteBlock}>
            <Text style={styles.transcriptText}>
              {evaluation.exampleAnswer}
            </Text>
          </View>
        </Collapsible>

        <View style={[styles.card, styles.cardWarm]}>
          <Text style={styles.focusLabel}>次回の意識点</Text>
          <Text style={styles.focusText}>{evaluation.nextFocus}</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            disabled={isRestarting}
            onPress={() => void handleRetry()}
          >
            {isRestarting ? "開始中..." : "このテーマでもう一度練習する"}
          </PrimaryButton>
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
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 6,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-start",
    },
    backText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text2,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 28,
      gap: 14,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 30,
      color: palette.text,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text3,
      marginTop: -6,
    },
    overallCard: {
      flexDirection: "row",
      gap: 18,
      alignItems: "center",
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 24,
      padding: 18,
    },
    overallBody: {
      flex: 1,
      gap: 8,
    },
    summaryText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      lineHeight: 24,
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
      borderRadius: 22,
      padding: 18,
      gap: 10,
    },
    cardAccent: {
      backgroundColor: palette.accentDim,
    },
    cardDanger: {
      backgroundColor: palette.dangerDim,
    },
    cardWarm: {
      backgroundColor: palette.surface2,
    },
    sectionLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: palette.text,
    },
    transcriptText: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 24,
      color: palette.text,
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
    arrowDanger: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.danger,
      marginTop: 1,
    },
    rewriteBlock: {
      backgroundColor: palette.surface2,
      borderRadius: 18,
      padding: 14,
    },
    focusLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.accentWarm,
    },
    focusText: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 24,
      color: palette.text,
    },
    actions: {
      gap: 10,
    },
  });
}
