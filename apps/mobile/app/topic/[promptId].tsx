import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../../src/components/primary-button";
import { Tag } from "../../src/components/tag";
import { fetchPrompts } from "../../src/lib/api";
import { getPersonalizedPrompts } from "../../src/lib/personalization-storage";
import { findPromptById } from "../../src/lib/prompt-catalog";
import { createPracticeSession } from "../../src/lib/storage";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { categoryLabels, fonts, type ThemePalette } from "../../src/lib/theme";
import type {
  PersonalizedPracticePrompt,
  PracticePrompt,
} from "@kotoba-gym/core";

type TopicPrompt = PracticePrompt | PersonalizedPracticePrompt;

export default function TopicDetailScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const { promptId } = useLocalSearchParams<{ promptId: string }>();
  const [prompt, setPrompt] = useState<TopicPrompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);
        const [defaultPrompts, personalizedPrompts] = await Promise.all([
          fetchPrompts(),
          getPersonalizedPrompts(),
        ]);

        setPrompt(
          findPromptById({
            defaultPrompts,
            personalizedPrompts: personalizedPrompts ?? [],
            promptId: promptId ?? "",
          }),
        );
        setError(null);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "お題を読み込めませんでした。",
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [promptId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  if (!prompt) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>お題が見つかりません</Text>
          <Text style={styles.emptyBody}>
            {error ?? "最新の一覧を開いてから、もう一度選択してください。"}
          </Text>
          <PrimaryButton onPress={() => router.replace("/")}>
            ホームに戻る
          </PrimaryButton>
        </View>
      </SafeAreaView>
    );
  }

  const currentPrompt = prompt;

  async function handleStart() {
    const session = await createPracticeSession(currentPrompt);
    router.push({
      pathname: "/practice/[promptId]",
      params: { promptId: currentPrompt.id, sessionId: session.id },
    });
  }

  const axes = ["結論先出し", "構造化", "具体性", "技術妥当性", "簡潔性"];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.pageHeader}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={palette.text2} />
          <Text style={styles.backText}>お題一覧</Text>
        </Pressable>
        <Tag
          label={
            categoryLabels[currentPrompt.category] ?? currentPrompt.category
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>{currentPrompt.title}</Text>
          <Text style={styles.duration}>
            目安: {currentPrompt.durationLabel}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>シチュエーション</Text>
          <Text style={styles.cardBody}>{currentPrompt.prompt}</Text>
        </View>

        <View style={[styles.card, styles.cardWarm]}>
          <Text style={[styles.cardLabel, styles.cardLabelWarm]}>
            相手の期待
          </Text>
          <Text style={styles.cardBody}>{currentPrompt.situation}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>今回の狙い</Text>
          {currentPrompt.goals.map((goal) => (
            <Text key={goal} style={styles.goalItem}>
              ・{goal}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>評価の5軸</Text>
          <View style={styles.axisChips}>
            {axes.map((axis) => (
              <View key={axis} style={styles.axisChip}>
                <Text style={styles.axisChipText}>{axis}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.ctaSection}>
          <PrimaryButton onPress={() => void handleStart()}>
            回答を始める
          </PrimaryButton>
          <Text style={styles.ctaHint}>録音は何度でも撮り直せます</Text>
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
    loading: {
      fontFamily: fonts.body,
      color: palette.text2,
      fontSize: 14,
      textAlign: "center",
      marginTop: 40,
    },
    emptyState: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: "center",
      gap: 14,
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
    pageHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 8,
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
    content: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      gap: 12,
    },
    titleSection: {
      marginBottom: 16,
      marginTop: 8,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 28,
      lineHeight: 34,
      color: palette.text,
      marginBottom: 6,
    },
    duration: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
    },
    card: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 16,
      padding: 16,
    },
    cardWarm: {
      backgroundColor: palette.accentWarmDim,
      borderColor: palette.accentWarm,
    },
    cardLabel: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      fontWeight: "500",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: palette.text3,
      marginBottom: 8,
    },
    cardLabelWarm: {
      color: palette.accentWarm,
    },
    cardBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text,
      lineHeight: 22,
    },
    goalItem: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text,
      lineHeight: 22,
    },
    axisChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    axisChip: {
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    axisChipText: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text2,
    },
    ctaSection: {
      marginTop: 16,
    },
    ctaHint: {
      fontFamily: fonts.body,
      textAlign: "center",
      fontSize: 11,
      color: palette.text3,
      marginTop: 10,
    },
  });
}
