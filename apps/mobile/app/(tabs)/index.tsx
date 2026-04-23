import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../src/components/primary-button";
import {
  buildHomeFeed,
  buildResumeProgress,
} from "../../src/lib/home-screen-helpers";
import { listPracticeSessions, listThemes } from "../../src/lib/storage";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../../src/lib/theme";
import type { PracticeSessionRecord, ThemeRecord } from "@kotoba-gym/core";

function ThemeCard({
  theme,
  onPress,
  tone = "default",
}: {
  theme: ThemeRecord;
  onPress: () => void;
  tone?: "default" | "featured";
}) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <Pressable
      style={[
        styles.themeCard,
        tone === "featured" && styles.themeCardFeatured,
      ]}
      onPress={onPress}
    >
      <View style={styles.themeTopRow}>
        <Text style={styles.themeEyebrow}>THEME</Text>
        <Text style={styles.themeDuration}>{theme.durationLabel}</Text>
      </View>
      <Text style={styles.themeTitle}>{theme.title}</Text>
      <Text style={styles.themeMeta}>
        {theme.userInput.audience}に向けて / {theme.userInput.goal}
      </Text>
      <Text style={styles.themeMission}>{theme.mission}</Text>
      <View style={styles.themePointList}>
        {theme.talkingPoints.slice(0, 3).map((point) => (
          <Text key={point} style={styles.themePoint}>
            ・{point}
          </Text>
        ))}
      </View>
      <View style={styles.themeActionRow}>
        <Text style={styles.themeActionLabel}>テーマを見る</Text>
        <Ionicons name="arrow-forward" size={16} color={palette.background} />
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    void (async () => {
      try {
        setIsLoading(true);
        const [themeList, sessionList] = await Promise.all([
          listThemes(),
          listPracticeSessions(),
        ]);
        setThemes(themeList);
        setSessions(sessionList);
        setError(null);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "読み込みに失敗しました。",
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isFocused]);

  const homeFeed = buildHomeFeed({ themes, sessions });
  const resumeSession = homeFeed.resumeSession;
  const resumeProgress = resumeSession
    ? buildResumeProgress(resumeSession)
    : null;

  if (isLoading) {
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
        <View style={styles.heroShell}>
          <View style={styles.heroGlow} />
          <Text style={styles.eyebrow}>KOTOBA GYM</Text>
          <Text style={styles.heroTitle}>
            説明したいことを、そのまま練習に変える。
          </Text>
          <Text style={styles.heroBody}>
            テーマ、相手、目的を入れると、LLM
            が練習用の骨組みを整えます。同じテーマで何度でも話し直せます。
          </Text>

          <View style={styles.heroActions}>
            <PrimaryButton onPress={() => router.push("/theme/new")}>
              新しいテーマを作る
            </PrimaryButton>
            <Pressable
              style={styles.secondaryAction}
              onPress={() => router.push("/history")}
            >
              <Ionicons name="time-outline" size={16} color={palette.text2} />
              <Text style={styles.secondaryActionText}>練習履歴を見る</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>読み込みに失敗しました</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : null}

        {resumeSession && resumeProgress ? (
          <Pressable
            style={styles.resumeCard}
            onPress={() =>
              router.push({
                pathname: "/practice/[themeId]",
                params: {
                  themeId: resumeSession.theme.id,
                  sessionId: resumeSession.id,
                },
              })
            }
          >
            <View style={styles.resumeHeader}>
              <Text style={styles.resumeEyebrow}>CONTINUE</Text>
              <Text style={styles.resumeCount}>{resumeProgress.label}</Text>
            </View>
            <Text style={styles.resumeTitle}>{resumeSession.theme.title}</Text>
            <Text style={styles.resumeFocus}>
              次に意識すること: {resumeProgress.focusText}
            </Text>
            <View style={styles.resumeBarTrack}>
              <View
                style={[
                  styles.resumeBarFill,
                  { width: `${resumeProgress.ratio * 100}%` },
                ]}
              />
            </View>
          </Pressable>
        ) : null}

        {homeFeed.shouldShowEmptyState ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>最初のテーマを作りましょう</Text>
            <Text style={styles.emptyBody}>
              面接の自己紹介、障害報告、設計意図の共有など、いま説明したいことから始められます。
            </Text>
          </View>
        ) : null}

        {homeFeed.featuredTheme ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>最近作ったテーマ</Text>
            <ThemeCard
              theme={homeFeed.featuredTheme}
              tone="featured"
              onPress={() =>
                router.push({
                  pathname: "/theme/[themeId]",
                  params: { themeId: homeFeed.featuredTheme?.id ?? "" },
                })
              }
            />
          </View>
        ) : null}

        {homeFeed.recentThemes.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>ほかのテーマ</Text>
              <Text style={styles.sectionMeta}>
                {homeFeed.recentSessionCount} sessions
              </Text>
            </View>
            <View style={styles.themeList}>
              {homeFeed.recentThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  onPress={() =>
                    router.push({
                      pathname: "/theme/[themeId]",
                      params: { themeId: theme.id },
                    })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}
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
      gap: 18,
    },
    loadingText: {
      fontFamily: fonts.body,
      color: palette.text2,
      fontSize: 14,
      textAlign: "center",
      marginTop: 40,
    },
    heroShell: {
      position: "relative",
      overflow: "hidden",
      backgroundColor: palette.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 24,
      gap: 14,
    },
    heroGlow: {
      position: "absolute",
      top: -28,
      right: -10,
      width: 140,
      height: 140,
      borderRadius: 999,
      backgroundColor: palette.accentDim,
    },
    eyebrow: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 1.6,
      color: palette.accentWarm,
    },
    heroTitle: {
      fontFamily: fonts.heading,
      fontSize: 34,
      lineHeight: 38,
      color: palette.text,
      maxWidth: "90%",
    },
    heroBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
      maxWidth: "92%",
    },
    heroActions: {
      gap: 12,
      marginTop: 4,
    },
    secondaryAction: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 4,
    },
    secondaryActionText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: palette.text2,
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
    resumeCard: {
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.borderLight,
      borderRadius: 22,
      padding: 18,
      gap: 8,
    },
    resumeHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    resumeEyebrow: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 1.4,
      color: palette.text3,
    },
    resumeCount: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.accent,
    },
    resumeTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 17,
      color: palette.text,
    },
    resumeFocus: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      color: palette.text2,
    },
    resumeBarTrack: {
      height: 8,
      backgroundColor: palette.border,
      borderRadius: 999,
      overflow: "hidden",
      marginTop: 4,
    },
    resumeBarFill: {
      height: "100%",
      backgroundColor: palette.accent,
      borderRadius: 999,
    },
    emptyCard: {
      backgroundColor: palette.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 20,
      gap: 8,
    },
    emptyTitle: {
      fontFamily: fonts.heading,
      fontSize: 26,
      color: palette.text,
    },
    emptyBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    section: {
      gap: 12,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionLabel: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 1.4,
      color: palette.text3,
    },
    sectionMeta: {
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.text3,
    },
    themeList: {
      gap: 12,
    },
    themeCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 24,
      padding: 18,
      gap: 10,
    },
    themeCardFeatured: {
      backgroundColor: palette.surface2,
      borderColor: palette.border,
    },
    themeTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    themeEyebrow: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 1.4,
      color: palette.text3,
    },
    themeDuration: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.accentWarm,
    },
    themeTitle: {
      fontFamily: fonts.heading,
      fontSize: 28,
      lineHeight: 31,
      color: palette.text,
    },
    themeMeta: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: palette.text2,
    },
    themeMission: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    themePointList: {
      gap: 4,
    },
    themePoint: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text,
    },
    themeActionRow: {
      marginTop: 4,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: palette.accent,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    themeActionLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: palette.background,
    },
  });
}
