import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CategoryChips } from "../../src/components/category-chips";
import { StatsStrip } from "../../src/components/stats-strip";
import { Tag } from "../../src/components/tag";
import { fetchPrompts } from "../../src/lib/api";
import { listPracticeSessions } from "../../src/lib/storage";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { categoryLabels, fonts, type ThemePalette } from "../../src/lib/theme";
import type {
  PracticePrompt,
  PracticeSessionRecord,
} from "../../src/shared/practice";

export default function HomeScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const [prompts, setPrompts] = useState<PracticePrompt[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("すべて");

  useEffect(() => {
    void (async () => {
      try {
        const [promptList, sessionList] = await Promise.all([
          fetchPrompts(),
          listPracticeSessions(),
        ]);
        setPrompts(promptList);
        setSessions(sessionList);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "読み込みに失敗しました。",
        );
      }
    })();
  }, []);

  const categories = [
    "すべて",
    ...new Set(prompts.map((p) => categoryLabels[p.category] ?? p.category)),
  ];

  const filtered =
    activeCategory === "すべて"
      ? prompts
      : prompts.filter(
          (p) => (categoryLabels[p.category] ?? p.category) === activeCategory,
        );

  const recommended = sessions.find((s) => s.attempts.length === 1);
  const weekCount = sessions.length;
  const topCat = sessions.length
    ? (() => {
        const counts: Record<string, number> = {};
        for (const s of sessions) {
          const cat = categoryLabels[s.prompt.category] ?? s.prompt.category;
          counts[cat] = (counts[cat] ?? 0) + 1;
        }
        return (
          Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
        );
      })()
    : "—";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerGlow} />
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>KOTOBA-GYM</Text>
              <Text style={styles.heroTitle}>今日、何を練習しますか</Text>
              <Text style={styles.heroSubtitle}>
                短く、構造的に、伝わる話し方を毎日少しずつ整える。
              </Text>
            </View>
            <Pressable
              style={styles.avatar}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Ionicons name="person" size={18} color={palette.text2} />
            </Pressable>
          </View>

          <StatsStrip
            items={[
              { label: "今週の練習", value: String(weekCount), unit: "回" },
              { label: "連続日数", value: "—", unit: "日" },
              { label: "最多カテゴリ", value: topCat },
            ]}
          />
        </View>

        {recommended && (
          <View style={styles.pad}>
            <Text style={styles.sectionLabel}>おすすめ</Text>
            <Pressable
              style={styles.recommendedCard}
              onPress={() =>
                router.push({
                  pathname: "/practice/[promptId]",
                  params: {
                    promptId: recommended.prompt.id,
                    sessionId: recommended.id,
                  },
                })
              }
            >
              <View style={styles.recommendedMeta}>
                <Tag
                  label={
                    categoryLabels[recommended.prompt.category] ??
                    recommended.prompt.category
                  }
                />
                <Text style={styles.attemptLabel}>
                  Attempt {recommended.attempts.length}
                </Text>
              </View>
              <Text style={styles.recommendedTitle}>
                {recommended.prompt.title}
              </Text>
              <Text style={styles.recommendedFocus}>
                前回のフォーカス:{" "}
                {recommended.attempts[0]?.evaluation.nextFocus ?? "—"}
              </Text>
              <View style={styles.recommendedCta}>
                <Text style={styles.recommendedCtaText}>続きから練習する</Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={palette.background}
                />
              </View>
            </Pressable>
          </View>
        )}

        <CategoryChips
          categories={categories}
          selected={activeCategory}
          onSelect={setActiveCategory}
        />

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.topicList}>
          <Text style={styles.sectionLabel}>お題一覧</Text>
          {filtered.map((topic) => (
            <Pressable
              key={topic.id}
              style={styles.topicCard}
              onPress={() =>
                router.push({
                  pathname: "/topic/[promptId]",
                  params: { promptId: topic.id },
                })
              }
            >
              <View style={styles.topicHeader}>
                <Tag label={categoryLabels[topic.category] ?? topic.category} />
                <Text style={styles.duration}>45〜60秒</Text>
              </View>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicDesc} numberOfLines={2}>
                {topic.prompt}
              </Text>
              <View style={styles.topicFooter}>
                <Text style={styles.topicExpectation} numberOfLines={1}>
                  <Text style={{ color: palette.accentWarm }}>● </Text>
                  {topic.situation}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={palette.text3}
                />
              </View>
            </Pressable>
          ))}
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
      paddingTop: 10,
      paddingBottom: 28,
      gap: 20,
    },
    pad: {
      paddingHorizontal: 20,
    },
    headerCard: {
      marginHorizontal: 20,
      marginTop: 6,
      padding: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      overflow: "hidden",
      gap: 18,
    },
    headerGlow: {
      position: "absolute",
      top: -44,
      right: -28,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: palette.accentDim,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
    },
    headerCopy: {
      flex: 1,
      gap: 6,
    },
    eyebrow: {
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.accent,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
    heroTitle: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: palette.text,
      letterSpacing: -0.6,
      lineHeight: 34,
    },
    heroSubtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
      lineHeight: 21,
      maxWidth: 250,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.borderLight,
      alignItems: "center",
      justifyContent: "center",
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
    recommendedCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: 20,
      padding: 18,
      shadowColor: palette.black,
      shadowOpacity: 0.06,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 2,
    },
    recommendedMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    attemptLabel: {
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.text3,
    },
    recommendedTitle: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: palette.text,
      marginBottom: 8,
      lineHeight: 26,
    },
    recommendedFocus: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
      lineHeight: 20,
      marginBottom: 16,
    },
    recommendedCta: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: palette.accent,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    recommendedCtaText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      fontWeight: "600",
      color: palette.background,
    },
    errorCard: {
      backgroundColor: palette.dangerDim,
      borderRadius: 16,
      padding: 14,
      marginHorizontal: 20,
      borderWidth: 1,
      borderColor: palette.danger,
    },
    errorText: {
      fontFamily: fonts.body,
      color: palette.danger,
      fontSize: 14,
      fontWeight: "700",
    },
    topicList: {
      paddingHorizontal: 20,
      gap: 10,
    },
    topicCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 18,
      padding: 16,
    },
    topicHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    duration: {
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.text3,
    },
    topicTitle: {
      fontFamily: fonts.heading,
      fontSize: 17,
      color: palette.text,
      marginBottom: 8,
      lineHeight: 23,
    },
    topicDesc: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
      lineHeight: 20,
      marginBottom: 12,
    },
    topicFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      gap: 8,
    },
    topicExpectation: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: palette.text3,
      flex: 1,
    },
  });
}
