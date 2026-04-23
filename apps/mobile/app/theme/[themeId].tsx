import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../../src/components/primary-button";
import { ScoreDonut } from "../../src/components/score-donut";
import { Tag } from "../../src/components/tag";
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
  return `${date.getMonth() + 1}/${date.getDate()}`;
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

const CIRCLE_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

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

  const latestSession = sessions.length > 0 ? sessions[0] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={palette.text2} />
          <Text style={styles.backText}>ホーム</Text>
        </Pressable>

        {/* Header: eyebrow + title + tags */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>THEME</Text>
          <Text style={styles.title}>{theme.title}</Text>
          <View style={styles.tagRow}>
            <Tag label={`👤 ${theme.persona.name}`} />
            <Tag label={`⏱ ${theme.durationLabel}`} />
            <Tag label="📊 5つの観点" variant="warm" />
          </View>
        </View>

        {/* Primary CTA */}
        <PrimaryButton
          disabled={isStarting}
          onPress={() => void handleStart()}
        >
          {isStarting ? "開始中..." : "このテーマで練習する →"}
        </PrimaryButton>

        {/* Latest session score */}
        {latestSession ? (
          <Pressable
            style={styles.lastScoreRow}
            onPress={() =>
              router.push({
                pathname: "/session/[sessionId]/feedback",
                params: { sessionId: latestSession.id },
              })
            }
          >
            <ScoreDonut score={getAverageScore(latestSession)} size={48} />
            <View style={styles.lastScoreBody}>
              <Text style={styles.lastScoreDate}>
                前回{" "}
                {formatDate(
                  latestSession.recordedAt ?? latestSession.updatedAt,
                )}
              </Text>
              <Text numberOfLines={2} style={styles.lastScoreSummary}>
                {latestSession.evaluation?.summary ??
                  "評価はまだありません。"}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* BRIEF card — unified */}
        <View style={styles.briefCard}>
          <Text style={styles.briefHeader}>BRIEF</Text>

          {/* Scene / Mission */}
          <View style={styles.briefSection}>
            <Text style={styles.briefLabel}>💬 シーン</Text>
            <Text style={styles.briefBody}>{theme.mission}</Text>
          </View>

          {/* Persona + audience */}
          <View style={styles.briefSection}>
            <Text style={styles.briefLabel}>🧑 相手</Text>
            <Text style={styles.briefBody}>
              {theme.persona.description}
              {theme.audienceSummary
                ? `\n${theme.audienceSummary}`
                : ""}
            </Text>
          </View>

          {/* Talking points */}
          <View style={styles.briefSection}>
            <Text style={styles.briefLabel}>💬 伝えるポイント</Text>
            {theme.talkingPoints.map((point) => (
              <Text key={point} style={styles.briefBody}>
                ・{point}
              </Text>
            ))}
          </View>

          {/* Recommended structure */}
          <View style={styles.briefSection}>
            <Text style={styles.briefLabel}>📋 おすすめの流れ</Text>
            {theme.recommendedStructure.map((item, index) => (
              <Text key={item} style={styles.structureItem}>
                <Text style={styles.structureNumber}>
                  {CIRCLE_NUMBERS[index] ?? `${index + 1}.`}
                </Text>
                {"  "}
                {item}
              </Text>
            ))}
          </View>
        </View>

        {/* Practice history */}
        {sessions.length > 0 ? (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>練習の記録</Text>
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
                    <Text style={styles.sessionDate}>
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
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Bottom action */}
        <PrimaryButton
          variant="ghost"
          onPress={() => router.push("/theme/new")}
        >
          新しいテーマを作る
        </PrimaryButton>
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

    /* ── Header ─────────────────────── */
    header: {
      gap: 8,
    },
    eyebrow: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 1.4,
      color: palette.text3,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 28,
      lineHeight: 34,
      color: palette.text,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 2,
    },

    /* ── Latest score ───────────────── */
    lastScoreRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: palette.surface2,
      borderRadius: 18,
      padding: 14,
    },
    lastScoreBody: {
      flex: 1,
      gap: 2,
    },
    lastScoreDate: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: palette.text2,
    },
    lastScoreSummary: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      color: palette.text2,
    },

    /* ── BRIEF card ──────────────────── */
    briefCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 22,
      padding: 20,
      gap: 20,
    },
    briefHeader: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 1.4,
      color: palette.text3,
    },
    briefSection: {
      gap: 6,
    },
    briefLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.text,
    },
    briefBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    structureItem: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    structureNumber: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.accent,
    },

    /* ── History ──────────────────────── */
    historySection: {
      gap: 10,
    },
    historyTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
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
    sessionDate: {
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

    /* ── Misc ─────────────────────────── */
    errorText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.danger,
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
