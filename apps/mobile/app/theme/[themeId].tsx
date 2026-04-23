import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../../src/components/primary-button";
import { ScoreDonut } from "../../src/components/score-donut";
import {
  createPracticeSession,
  getTheme,
  listPracticeSessions,
} from "../../src/lib/storage";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../../src/lib/theme";
import type { PracticeSessionRecord, ThemeRecord } from "@kotoba-gym/core";

function formatDate(iso: string) {
  const date = new Date(iso);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getAverageScore(session: PracticeSessionRecord) {
  if (!session.evaluation) {
    return 0;
  }

  return Math.round(
    (session.evaluation.scores.reduce((sum, item) => sum + item.score, 0) /
      session.evaluation.scores.length) *
      20,
  );
}

export default function ThemeDetailScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const { themeId } = useLocalSearchParams<{ themeId: string }>();
  const [theme, setTheme] = useState<ThemeRecord | null>(null);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);
        const [nextTheme, nextSessions] = await Promise.all([
          getTheme(themeId ?? ""),
          listPracticeSessions(themeId ?? ""),
        ]);
        setTheme(nextTheme);
        setSessions(
          nextSessions.filter((session) => session.evaluation !== null),
        );
        setError(null);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "テーマを読み込めませんでした。",
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [themeId]);

  async function handleStart() {
    if (!theme || isStarting) {
      return;
    }

    setIsStarting(true);

    try {
      const session = await createPracticeSession(theme);
      router.push({
        pathname: "/practice/[themeId]",
        params: { themeId: theme.id, sessionId: session.id },
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "セッションを開始できませんでした。",
      );
      setIsStarting(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  if (!theme) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>テーマが見つかりません</Text>
          <Text style={styles.emptyBody}>
            {error ?? "最新の一覧からもう一度開いてください。"}
          </Text>
          <PrimaryButton onPress={() => router.replace("/")}>
            ホームへ戻る
          </PrimaryButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={palette.text2} />
          <Text style={styles.backText}>ホーム</Text>
        </Pressable>

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>THEME BRIEF</Text>
          <Text style={styles.heroTitle}>{theme.title}</Text>
          <Text style={styles.heroMeta}>
            {theme.persona.name} / {theme.userInput.goal}
          </Text>
          <Text style={styles.heroMission}>{theme.mission}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>相手</Text>
          <Text style={styles.personaName}>
            {theme.persona.emoji} {theme.persona.name}
          </Text>
          <Text style={styles.bodyText}>{theme.persona.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>相手への前提整理</Text>
          <Text style={styles.bodyText}>{theme.audienceSummary}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>伝えるポイント</Text>
          {theme.talkingPoints.map((point) => (
            <Text key={point} style={styles.pointText}>
              ・{point}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>おすすめ構成</Text>
          {theme.recommendedStructure.map((item, index) => (
            <Text key={item} style={styles.pointText}>
              {index + 1}. {item}
            </Text>
          ))}
        </View>

        <View style={styles.metricsCard}>
          <View>
            <Text style={styles.metricLabel}>目安時間</Text>
            <Text style={styles.metricValue}>{theme.durationLabel}</Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>評価軸</Text>
            <Text style={styles.metricValue}>5 axes</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>練習の記録</Text>
          {sessions.length === 0 ? (
            <Text style={styles.bodyText}>
              まだこのテーマの練習記録はありません。
            </Text>
          ) : (
            <View style={styles.sessionList}>
              {sessions.map((session) => (
                <Pressable
                  key={session.id}
                  style={styles.sessionRow}
                  onPress={() =>
                    router.push({
                      pathname: "/session/[sessionId]/feedback",
                      params: { sessionId: session.id },
                    })
                  }
                >
                  <ScoreDonut score={getAverageScore(session)} size={48} />
                  <View style={styles.sessionBody}>
                    <Text style={styles.sessionTitle}>
                      {formatDate(session.recordedAt ?? session.updatedAt)}
                    </Text>
                    <Text numberOfLines={2} style={styles.sessionSummary}>
                      {session.evaluation?.summary ?? "評価はまだありません。"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={palette.text3}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            disabled={isStarting}
            onPress={() => void handleStart()}
          >
            {isStarting ? "開始中..." : "このテーマで練習する"}
          </PrimaryButton>
          <PrimaryButton
            variant="ghost"
            onPress={() => router.push("/theme/new")}
          >
            新しいテーマを作る
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
    scroll: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 32,
      gap: 14,
    },
    loadingText: {
      fontFamily: fonts.body,
      color: palette.text2,
      fontSize: 14,
      textAlign: "center",
      marginTop: 40,
    },
    backBtn: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    backText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text2,
    },
    heroCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 28,
      padding: 22,
      gap: 10,
    },
    heroEyebrow: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 1.4,
      color: palette.accentWarm,
    },
    heroTitle: {
      fontFamily: fonts.heading,
      fontSize: 34,
      lineHeight: 38,
      color: palette.text,
    },
    heroMeta: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: palette.text2,
    },
    heroMission: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 24,
      color: palette.text,
    },
    card: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 22,
      padding: 18,
      gap: 8,
    },
    sectionLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: palette.text,
    },
    bodyText: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    personaName: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: palette.text,
      marginBottom: 6,
    },
    pointText: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text,
    },
    sessionList: {
      gap: 10,
    },
    sessionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: palette.surface2,
      borderRadius: 18,
      padding: 14,
    },
    sessionBody: {
      flex: 1,
      gap: 4,
    },
    sessionTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.text,
    },
    sessionSummary: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      color: palette.text2,
    },
    metricsCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: palette.surface2,
      borderRadius: 20,
      padding: 18,
    },
    metricLabel: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
      marginBottom: 6,
    },
    metricValue: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: palette.text,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.danger,
    },
    actions: {
      gap: 10,
      marginTop: 4,
    },
    emptyCard: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: palette.text,
      textAlign: "center",
    },
    emptyBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
      textAlign: "center",
    },
  });
}
