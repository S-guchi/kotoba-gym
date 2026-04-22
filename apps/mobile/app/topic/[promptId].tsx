import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../../src/components/primary-button";
import { Tag } from "../../src/components/tag";
import { fetchPrompts } from "../../src/lib/api";
import { createPracticeSession } from "../../src/lib/storage";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { categoryLabels, fonts, type ThemePalette } from "../../src/lib/theme";
import type { PracticePrompt } from "../../src/shared/practice";

export default function TopicDetailScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const { promptId } = useLocalSearchParams<{ promptId: string }>();
  const [prompt, setPrompt] = useState<PracticePrompt | null>(null);

  useEffect(() => {
    void (async () => {
      const prompts = await fetchPrompts();
      setPrompt(prompts.find((p) => p.id === promptId) ?? null);
    })();
  }, [promptId]);

  if (!prompt) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  async function handleStart() {
    if (!prompt) return;
    const session = await createPracticeSession(prompt);
    router.push({
      pathname: "/practice/[promptId]",
      params: { promptId: prompt.id, sessionId: session.id },
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
        <Tag label={categoryLabels[prompt.category] ?? prompt.category} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>{prompt.title}</Text>
          <Text style={styles.duration}>目安: 45〜60秒</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>シチュエーション</Text>
          <Text style={styles.cardBody}>{prompt.prompt}</Text>
        </View>

        <View style={[styles.card, styles.cardWarm]}>
          <Text style={[styles.cardLabel, styles.cardLabelWarm]}>
            相手の期待
          </Text>
          <Text style={styles.cardBody}>{prompt.situation}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>今回の狙い</Text>
          {prompt.goals.map((goal) => (
            <Text key={goal} style={styles.goalItem}>
              ・{goal}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>評価の5軸</Text>
          <View style={styles.axisChips}>
            {axes.map((ax) => (
              <View key={ax} style={styles.axisChip}>
                <Text style={styles.axisChipText}>{ax}</Text>
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
