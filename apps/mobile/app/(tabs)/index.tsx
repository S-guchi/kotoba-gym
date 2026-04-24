import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../src/components/primary-button";
import { ThemeListRow } from "../../src/components/theme-list-row";
import {
  buildHomeFeed,
  getHomeThemePreviewRows,
  type HomeFeed,
} from "../../src/lib/home-screen-helpers";
import {
  createPracticeSession,
  listPracticeSessions,
  listThemes,
} from "../../src/lib/storage";
import { fonts, type ThemePalette } from "../../src/lib/theme";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import type { PracticeSessionRecord, ThemeRecord } from "@kotoba-gym/core";

type TodayRun = NonNullable<HomeFeed["todaysRun"]>;

const WEEKDAY_DOT_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function formatWeekDiff(diff: number) {
  if (diff === 0) {
    return "±0";
  }

  return diff > 0 ? `+${diff}` : `${diff}`;
}

function Header({
  feed,
  onHistoryPress,
}: {
  feed: HomeFeed;
  onHistoryPress: () => void;
}) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.dayLabel}>{feed.header.label}</Text>
        <Text style={styles.greeting}>{feed.header.greeting}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        style={styles.historyButton}
        onPress={onHistoryPress}
      >
        <Ionicons name="time-outline" size={18} color={palette.text2} />
      </Pressable>
    </View>
  );
}

function StreakCard({ feed }: { feed: HomeFeed }) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <View style={styles.streakCard}>
      <View style={styles.streakMetrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>STREAK</Text>
          <Text style={styles.metricValue}>
            {feed.stats.streakDays}
            <Text style={styles.metricUnit}>日</Text>
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>THIS WEEK</Text>
          <Text style={styles.metricValue}>
            {feed.stats.weeklySessionCount}
            <Text style={styles.metricUnit}>本</Text>
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>VS LAST</Text>
          <Text style={styles.metricValue}>
            {formatWeekDiff(feed.stats.weekOverWeekDiff)}
          </Text>
        </View>
      </View>

      <View style={styles.weekRow}>
        {feed.stats.practicedWeekdays.map((isPracticed, index) => (
          <View
            key={`${WEEKDAY_DOT_LABELS[index]}-${index}`}
            style={styles.dayDotBox}
          >
            <View
              style={[
                styles.dayDot,
                isPracticed ? styles.dayDotActive : styles.dayDotInactive,
              ]}
            />
            <Text style={styles.dayDotLabel}>{WEEKDAY_DOT_LABELS[index]}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.streakCaption}>
        {feed.stats.daysUntilWeeklyGoal === 0
          ? "今週は毎日分のリズムを作れています"
          : `あと${feed.stats.daysUntilWeeklyGoal}日で1週間分のリズム`}
      </Text>
    </View>
  );
}

function TodayRunCard({
  run,
  isStarting,
  onStart,
}: {
  run: TodayRun;
  isStarting: boolean;
  onStart: (theme: ThemeRecord) => void;
}) {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const challengeText =
    run.previousScore === null
      ? "まず1本録って、次回の基準点を作る"
      : `前回${run.previousScore}点 → ${run.targetScore}点超えを狙う`;

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.todayCard,
        pressed && styles.pressedCard,
        isStarting && styles.disabledCard,
      ]}
      disabled={isStarting}
      onPress={() => onStart(run.theme)}
    >
      <View style={styles.todayHeader}>
        <View>
          <Text style={styles.cardEyebrow}>TODAY RUN</Text>
          <Text numberOfLines={2} style={styles.todayTitle}>
            {run.theme.title}
          </Text>
        </View>
        <View style={styles.flameBadge}>
          <Text style={styles.flameText}>🔥</Text>
        </View>
      </View>

      <Text style={styles.todayChallenge}>{challengeText}</Text>

      <View style={styles.todayFooter}>
        <Text numberOfLines={1} style={styles.todayMeta}>
          {run.theme.persona.name} / {run.theme.durationLabel}
        </Text>
        <View style={styles.startPill}>
          <Text style={styles.startPillText}>
            {isStarting ? "準備中" : "始める"}
          </Text>
          <Ionicons name="mic" size={14} color={palette.background} />
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const isFocused = useIsFocused();
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [startingThemeId, setStartingThemeId] = useState<string | null>(null);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let isActive = true;

    void (async () => {
      try {
        const [themeList, sessionList] = await Promise.all([
          listThemes(),
          listPracticeSessions(),
        ]);
        if (!isActive) {
          return;
        }
        setThemes(themeList);
        setSessions(sessionList);
        setError(null);
        setStartingThemeId(null);
      } catch (cause) {
        if (!isActive) {
          return;
        }
        setError(
          cause instanceof Error ? cause.message : "読み込みに失敗しました。",
        );
      } finally {
        if (isActive) {
          setIsInitialLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isFocused]);

  async function handleStartPractice(theme: ThemeRecord) {
    if (startingThemeId) {
      return;
    }

    try {
      setStartingThemeId(theme.id);
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
      setStartingThemeId(null);
    }
  }

  const homeFeed = buildHomeFeed({ themes, sessions });
  const previewThemeRows = getHomeThemePreviewRows(homeFeed.themeRows);

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Header
          feed={homeFeed}
          onHistoryPress={() => router.push("/history")}
        />

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>読み込みに失敗しました</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : null}

        {homeFeed.shouldShowEmptyState ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>最初のテーマを作りましょう</Text>
            <Text style={styles.emptyBody}>
              面接の自己紹介、障害報告、設計意図の共有など、いま説明したいことから始められます。
            </Text>
            <PrimaryButton onPress={() => router.push("/theme/new")}>
              テーマを作る
            </PrimaryButton>
          </View>
        ) : (
          <>
            <StreakCard feed={homeFeed} />

            {homeFeed.todaysRun ? (
              <TodayRunCard
                run={homeFeed.todaysRun}
                isStarting={startingThemeId === homeFeed.todaysRun.theme.id}
                onStart={handleStartPractice}
              />
            ) : null}

            {homeFeed.themeRows.length > 0 ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  style={styles.createThemeButton}
                  onPress={() => router.push("/theme/new")}
                >
                  <Ionicons name="add" size={18} color={palette.text2} />
                  <Text style={styles.createThemeText}>新しいテーマを作る</Text>
                </Pressable>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>THEMES</Text>
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => router.push("/themes")}
                    >
                      <Text style={styles.sectionLink}>more..</Text>
                    </Pressable>
                  </View>
                  <View style={styles.themeList}>
                    {previewThemeRows.map((row) => (
                      <ThemeListRow
                        key={row.theme.id}
                        row={row}
                        onPress={() =>
                          router.push({
                            pathname: "/theme/[themeId]",
                            params: { themeId: row.theme.id },
                          })
                        }
                      />
                    ))}
                  </View>
                </View>
              </>
            ) : null}
          </>
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
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 32,
      gap: 16,
    },
    loadingText: {
      fontFamily: fonts.body,
      color: palette.text2,
      fontSize: 14,
      textAlign: "center",
      marginTop: 40,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    headerCopy: {
      flex: 1,
      gap: 3,
    },
    dayLabel: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 1.2,
      color: palette.accentWarm,
    },
    greeting: {
      fontFamily: fonts.heading,
      fontSize: 32,
      lineHeight: 36,
      color: palette.text,
    },
    historyButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    errorCard: {
      backgroundColor: palette.dangerDim,
      borderRadius: 18,
      padding: 16,
      gap: 6,
    },
    errorTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.danger,
    },
    errorBody: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      color: palette.text2,
    },
    emptyCard: {
      backgroundColor: palette.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 20,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: palette.text,
    },
    emptyBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    streakCard: {
      backgroundColor: palette.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 16,
      gap: 14,
    },
    streakMetrics: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 12,
    },
    metric: {
      flex: 1,
      gap: 5,
    },
    metricDivider: {
      width: 1,
      backgroundColor: palette.border,
    },
    metricLabel: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      letterSpacing: 0.8,
      color: palette.text3,
    },
    metricValue: {
      fontFamily: fonts.heading,
      fontSize: 32,
      lineHeight: 34,
      color: palette.text,
    },
    metricUnit: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: palette.text2,
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    dayDotBox: {
      flex: 1,
      alignItems: "center",
      gap: 5,
    },
    dayDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    dayDotActive: {
      backgroundColor: palette.accent,
    },
    dayDotInactive: {
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.border,
    },
    dayDotLabel: {
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.text3,
    },
    streakCaption: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: palette.text2,
    },
    todayCard: {
      backgroundColor: palette.accent,
      borderRadius: 24,
      padding: 18,
      gap: 16,
    },
    pressedCard: {
      opacity: 0.78,
    },
    disabledCard: {
      opacity: 0.6,
    },
    todayHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 14,
    },
    cardEyebrow: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 1.2,
      color: palette.background,
      opacity: 0.72,
    },
    todayTitle: {
      marginTop: 5,
      fontFamily: fonts.heading,
      fontSize: 30,
      lineHeight: 33,
      color: palette.background,
      maxWidth: 250,
    },
    flameBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.white,
    },
    flameText: {
      fontSize: 22,
    },
    todayChallenge: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      lineHeight: 22,
      color: palette.background,
    },
    todayFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    todayMeta: {
      flex: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: palette.background,
      opacity: 0.74,
    },
    startPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: palette.text,
    },
    startPillText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: palette.background,
    },
    section: {
      gap: 10,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 2,
    },
    sectionLabel: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 1.3,
      color: palette.text3,
    },
    sectionLink: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      color: palette.accentWarm,
      letterSpacing: 0.2,
    },
    themeList: {
      gap: 8,
    },
    createThemeButton: {
      minHeight: 52,
      borderRadius: 18,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: palette.borderLight,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: palette.accentDim,
    },
    createThemeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.text2,
    },
  });
}
