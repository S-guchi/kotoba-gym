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
import { categoryLabels, fonts, palette } from "../../src/lib/theme";
import type {
  PracticePrompt,
  PracticeSessionRecord,
} from "../../src/shared/practice";

export default function HomeScreen() {
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

  // Find a recommended session (has 1 attempt, can retry)
  const recommended = sessions.find((s) => s.attempts.length === 1);

  // Stats
  const weekCount = sessions.length;
  const topCat = sessions.length
    ? (() => {
        const counts: Record<string, number> = {};
        for (const s of sessions) {
          const cat = categoryLabels[s.prompt.category] ?? s.prompt.category;
          counts[cat] = (counts[cat] ?? 0) + 1;
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
          "—";
      })()
    : "—";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>KOTOBA-GYM</Text>
            <Text style={styles.heroTitle}>今日、何を練習しますか</Text>
          </View>
          <Pressable
            style={styles.avatar}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Ionicons name="person" size={18} color={palette.text2} />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.pad}>
          <StatsStrip
            items={[
              { label: "今週の練習", value: String(weekCount), unit: "回" },
              { label: "連続日数", value: "—", unit: "日" },
              { label: "最多カテゴリ", value: topCat },
            ]}
          />
        </View>

        {/* Recommended */}
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

        {/* Category filter */}
        <CategoryChips
          categories={categories}
          selected={activeCategory}
          onSelect={setActiveCategory}
        />

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Topic list */}
        <View style={styles.topicList}>
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
                <Tag
                  label={categoryLabels[topic.category] ?? topic.category}
                />
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    paddingTop: 16,
    paddingBottom: 20,
    gap: 20,
  },
  pad: {
    paddingHorizontal: 20,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: palette.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: palette.text,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    borderRadius: 18,
    padding: 16,
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
    fontSize: 18,
    color: palette.text,
    marginBottom: 6,
  },
  recommendedFocus: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.text2,
    lineHeight: 18,
    marginBottom: 14,
  },
  recommendedCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.accent,
    borderRadius: 10,
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
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(196,122,107,0.2)",
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
    borderRadius: 16,
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
    fontSize: 16,
    color: palette.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  topicDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.text2,
    lineHeight: 18,
    marginBottom: 12,
  },
  topicFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  topicExpectation: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.text3,
    flex: 1,
  },
});
