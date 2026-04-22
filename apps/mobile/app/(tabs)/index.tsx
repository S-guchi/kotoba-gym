import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatsStrip } from "../../src/components/stats-strip";
import { Tag } from "../../src/components/tag";
import { fetchPrompts } from "../../src/lib/api";
import {
  buildHomeFeed,
  buildResumeProgress,
  isPersonalizedPrompt,
  type HomePrompt,
} from "../../src/lib/home-screen-helpers";
import { getPersonalizationProfile } from "../../src/lib/personalization-storage";
import { listPracticeSessions } from "../../src/lib/storage";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { categoryLabels, fonts, type ThemePalette } from "../../src/lib/theme";
import type {
  PersonalizationProfile,
  PersonalizedPracticePrompt,
  PracticeSessionRecord,
} from "@kotoba-gym/core";

function HeroCard({
  prompt,
  label,
  actionLabel,
  onActionPress,
}: {
  prompt: HomePrompt;
  label: string;
  actionLabel: string;
  onActionPress: () => void;
}) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <View>
      <View style={styles.heroHeader}>
        <View style={styles.heroHeaderLabel}>
          <Text style={styles.heroSparkle}>✦</Text>
          <Text style={styles.heroSectionLabel}>{label}</Text>
        </View>
        <Pressable onPress={onActionPress}>
          <Text style={styles.heroActionLabel}>{actionLabel}</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.heroCard}
        onPress={() =>
          router.push({
            pathname: "/topic/[promptId]",
            params: { promptId: prompt.id },
          })
        }
      >
        <View style={styles.heroDecor} />
        <View style={styles.heroMetaRow}>
          <Tag label={categoryLabels[prompt.category] ?? prompt.category} />
          {isPersonalizedPrompt(prompt) ? (
            <View style={styles.personalizedBadge}>
              <Text style={styles.personalizedBadgeText}>👤 あなた向け</Text>
            </View>
          ) : null}
          <Text style={styles.heroDuration}>⏱ {prompt.durationLabel}</Text>
        </View>

        <Text style={styles.heroTitle}>{prompt.title}</Text>
        <Text style={styles.heroDescription}>{prompt.prompt}</Text>

        <View style={styles.heroCta}>
          <Text style={styles.heroCtaText}>練習する</Text>
          <Ionicons name="arrow-forward" size={16} color={palette.background} />
        </View>
      </Pressable>
    </View>
  );
}

function CandidateCard({ prompt }: { prompt: HomePrompt }) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <Pressable
      style={styles.candidateCard}
      onPress={() =>
        router.push({
          pathname: "/topic/[promptId]",
          params: { promptId: prompt.id },
        })
      }
    >
      <View style={styles.candidateMetaRow}>
        <Tag label={categoryLabels[prompt.category] ?? prompt.category} />
        <Text style={styles.candidateDuration}>
          {prompt.durationLabel.split("〜")[0]}〜
        </Text>
      </View>
      <Text style={styles.candidateTitle}>{prompt.title}</Text>
      <Text numberOfLines={2} style={styles.candidateDescription}>
        {prompt.prompt}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const isFocused = useIsFocused();
  const [prompts, setPrompts] = useState<PersonalizedPracticePrompt[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [profile, setProfile] = useState<PersonalizationProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    void (async () => {
      try {
        const [promptList, sessionList, personalizationProfile] =
          await Promise.all([
            fetchPrompts(),
            listPracticeSessions(),
            getPersonalizationProfile(),
          ]);

        setPrompts(promptList);
        setSessions(sessionList);
        setProfile(personalizationProfile);
        setError(null);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "読み込みに失敗しました。",
        );
      }
    })();
  }, [isFocused]);

  const weekCount = sessions.length;
  const topCategory = sessions.length
    ? (() => {
        const counts: Record<string, number> = {};
        for (const session of sessions) {
          const category =
            categoryLabels[session.prompt.category] ?? session.prompt.category;
          counts[category] = (counts[category] ?? 0) + 1;
        }
        return (
          Object.entries(counts).sort(
            (left, right) => right[1] - left[1],
          )[0]?.[0] ?? "—"
        );
      })()
    : "—";

  const homeFeed = buildHomeFeed({
    prompts: prompts.filter(isPersonalizedPrompt),
    sessions,
    profile,
  });
  const resumeSession = homeFeed.resumeSession;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>KOTOBA-GYM</Text>
              <Text style={styles.heroHeading}>今日は何を練習しますか？</Text>
              {homeFeed.profileHighlights.length > 0 ? (
                <View style={styles.profileChipRow}>
                  {homeFeed.profileHighlights.map((item) => (
                    <View key={item} style={styles.profileChip}>
                      <Text style={styles.profileChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.headerActions}>
              <Pressable
                style={styles.headerIconButton}
                onPress={() => router.push("/history")}
              >
                <Ionicons name="time-outline" size={18} color={palette.text2} />
              </Pressable>
              <Pressable
                style={styles.headerIconButton}
                onPress={() => router.push("/profile")}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={palette.text2}
                />
              </Pressable>
            </View>
          </View>

          <StatsStrip
            items={[
              {
                label: "今週の練習",
                value: String(weekCount),
                unit: "回",
                icon: "📅",
              },
              {
                label: "連続日数",
                value: sessions.length > 0 ? "1" : "0",
                unit: "日",
                icon: "🔥",
              },
              {
                label: "最多カテゴリ",
                value: topCategory,
                icon: "🏆",
              },
            ]}
          />

          {homeFeed.showOnboardingCta ? (
            <View style={styles.onboardingCard}>
              <Text style={styles.onboardingIcon}>🏋️</Text>
              <View style={styles.onboardingCopy}>
                <Text style={styles.onboardingTitle}>
                  {profile
                    ? "お題を再生成しませんか"
                    : "あなた向けのお題を生成しませんか"}
                </Text>
                <Text style={styles.onboardingDescription}>
                  {profile
                    ? "プロフィールに合わせて、新しいお題を作り直せます"
                    : "4問答えるだけで、専用のお題が届きます"}
                </Text>
              </View>
              <Pressable
                style={styles.onboardingButton}
                onPress={() =>
                  router.push(profile ? "/profile" : "/onboarding")
                }
              >
                <Text style={styles.onboardingButtonText}>
                  {profile ? "見る" : "試す"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {homeFeed.heroPrompt ? (
            <HeroCard
              actionLabel={profile ? "プロフィールを見る →" : "設定する →"}
              label={homeFeed.heroSectionLabel}
              onActionPress={() =>
                router.push(profile ? "/profile" : "/onboarding")
              }
              prompt={homeFeed.heroPrompt}
            />
          ) : null}
        </View>

        {homeFeed.candidatePrompts.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>他の候補</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.candidateScroll}
            >
              {homeFeed.candidatePrompts.map((prompt) => (
                <CandidateCard key={prompt.id} prompt={prompt} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {resumeSession ? (
          <View style={styles.sectionBlock}>
            <View style={styles.resumeHeader}>
              <View style={styles.resumeLabelRow}>
                <Ionicons name="time-outline" size={14} color={palette.text3} />
                <Text style={styles.resumeLabel}>前回の続き</Text>
              </View>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/practice/[promptId]",
                    params: {
                      promptId: resumeSession.prompt.id,
                      sessionId: resumeSession.id,
                    },
                  })
                }
              >
                <Text style={styles.resumeAction}>続きから練習 →</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.resumeCard}
              onPress={() =>
                router.push({
                  pathname: "/practice/[promptId]",
                  params: {
                    promptId: resumeSession.prompt.id,
                    sessionId: resumeSession.id,
                  },
                })
              }
            >
              <View style={styles.resumeIconWrap}>
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={22}
                  color={palette.accent}
                />
              </View>
              <View style={styles.resumeBody}>
                <Text style={styles.resumeTitle}>
                  {resumeSession.prompt.title}
                </Text>
                <Text style={styles.resumeFocus}>
                  {buildResumeProgress(resumeSession).focusText}
                </Text>
                <View style={styles.resumeProgressRow}>
                  <View style={styles.resumeTrack}>
                    <View
                      style={[
                        styles.resumeFill,
                        {
                          width: `${buildResumeProgress(resumeSession).ratio * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.resumeProgressLabel}>
                    {buildResumeProgress(resumeSession).label}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
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
      paddingTop: 8,
      paddingBottom: 28,
      gap: 20,
    },
    headerSection: {
      paddingHorizontal: 20,
      gap: 18,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 8,
    },
    headerCopy: {
      flex: 1,
    },
    eyebrow: {
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.accent,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    heroHeading: {
      fontFamily: fonts.heading,
      fontSize: 28,
      lineHeight: 32,
      color: palette.text,
      letterSpacing: -0.5,
      marginBottom: 10,
    },
    profileChipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    profileChip: {
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.borderLight,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    profileChipText: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.text2,
    },
    headerActions: {
      flexDirection: "row",
      gap: 8,
    },
    headerIconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.borderLight,
      alignItems: "center",
      justifyContent: "center",
    },
    onboardingCard: {
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.borderLight,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    onboardingIcon: {
      fontSize: 22,
    },
    onboardingCopy: {
      flex: 1,
      gap: 2,
    },
    onboardingTitle: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: palette.text,
      fontWeight: "500",
    },
    onboardingDescription: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: palette.text3,
    },
    onboardingButton: {
      backgroundColor: palette.accent,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    onboardingButtonText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: palette.background,
      fontWeight: "600",
    },
    heroHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    heroHeaderLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    heroSparkle: {
      color: palette.accent,
      fontSize: 13,
    },
    heroSectionLabel: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text2,
      letterSpacing: 0.5,
    },
    heroActionLabel: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.accent,
      letterSpacing: 0.5,
    },
    heroCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 14,
      overflow: "hidden",
    },
    heroDecor: {
      position: "absolute",
      top: 14,
      right: 14,
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: palette.accentDim,
      opacity: 0.7,
    },
    heroMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 12,
      paddingRight: 72,
    },
    personalizedBadge: {
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.borderLight,
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    personalizedBadgeText: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: palette.text2,
    },
    heroDuration: {
      marginLeft: "auto",
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.text3,
    },
    heroTitle: {
      fontFamily: fonts.heading,
      fontSize: 26,
      lineHeight: 32,
      color: palette.text,
      marginBottom: 10,
      paddingRight: 72,
    },
    heroDescription: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
      lineHeight: 20,
      marginBottom: 16,
    },
    heroCta: {
      backgroundColor: palette.accent,
      borderRadius: 14,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    heroCtaText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: palette.background,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    sectionBlock: {
      gap: 10,
    },
    sectionLabel: {
      paddingHorizontal: 20,
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
      letterSpacing: 0.5,
    },
    candidateScroll: {
      paddingHorizontal: 20,
      gap: 10,
    },
    candidateCard: {
      width: 150,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    candidateMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    candidateDuration: {
      fontFamily: fonts.mono,
      fontSize: 9,
      color: palette.text3,
    },
    candidateTitle: {
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
      color: palette.text,
      marginBottom: 6,
    },
    candidateDescription: {
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
      color: palette.text3,
    },
    resumeHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
    },
    resumeLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    resumeLabel: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text2,
      letterSpacing: 0.3,
    },
    resumeAction: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.accent,
      letterSpacing: 0.3,
    },
    resumeCard: {
      marginHorizontal: 20,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    resumeIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: palette.accentDim,
      borderWidth: 1,
      borderColor: palette.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    resumeBody: {
      flex: 1,
      gap: 6,
    },
    resumeTitle: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: palette.text,
      fontWeight: "500",
    },
    resumeFocus: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.text3,
    },
    resumeProgressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    resumeTrack: {
      flex: 1,
      height: 4,
      backgroundColor: palette.borderLight,
      borderRadius: 2,
      overflow: "hidden",
    },
    resumeFill: {
      height: "100%",
      backgroundColor: palette.accent,
      borderRadius: 2,
    },
    resumeProgressLabel: {
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.text3,
    },
    errorCard: {
      marginHorizontal: 20,
      backgroundColor: palette.dangerDim,
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: 16,
      padding: 14,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.danger,
    },
  });
}
