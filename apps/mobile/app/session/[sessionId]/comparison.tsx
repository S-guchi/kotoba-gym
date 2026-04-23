import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../../../src/components/primary-button";
import { getPracticeSession } from "../../../src/lib/storage";
import { useThemePalette } from "../../../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../../../src/lib/theme";
import type { PracticeSessionRecord } from "@kotoba-gym/core";

function toAverageScore(
  scoreDiff: { before: number; after: number }[],
  key: "before" | "after",
) {
  return Math.round(
    (scoreDiff.reduce((sum, item) => sum + item[key], 0) / scoreDiff.length) *
      20,
  );
}

export default function ComparisonScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<PracticeSessionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  if (error || notFound || !session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyCard}>
          <Text style={styles.body}>
            {notFound
              ? "セッションが見つかりません。"
              : "読み込みに失敗しました。"}
          </Text>
          <Text style={styles.errorText}>
            {error ?? "最新の一覧からもう一度選び直してください。"}
          </Text>
          <PrimaryButton onPress={() => router.replace("/")}>
            ホームへ戻る
          </PrimaryButton>
        </View>
      </SafeAreaView>
    );
  }

  const comparison = session.evaluation?.comparison;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.pageHeader}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={palette.text2} />
          <Text style={styles.backText}>フィードバック</Text>
        </Pressable>
        <Text style={styles.badge}>比較</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{session.theme.title}</Text>
        <Text style={styles.subtitle}>前回 → 今回</Text>

        {!comparison ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              比較は、同じテーマで前回の練習がある場合に表示されます。
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.deltaCard}>
              <View style={styles.deltaCol}>
                <Text style={styles.deltaBefore}>
                  {toAverageScore(comparison.scoreDiff, "before")}
                </Text>
                <Text style={styles.deltaLabel}>前回</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={palette.accent} />
              <View style={styles.deltaCol}>
                <Text style={styles.deltaAfter}>
                  {toAverageScore(comparison.scoreDiff, "after")}
                </Text>
                <Text style={styles.deltaLabel}>今回</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownLabel, styles.flexLabel]}>
                  軸
                </Text>
                <Text style={styles.breakdownLabel}>前回</Text>
                <Text style={styles.breakdownLabel}>→</Text>
                <Text style={styles.breakdownLabel}>今回</Text>
              </View>
              {comparison.scoreDiff.map((item) => (
                <View key={item.axis} style={styles.breakdownRow}>
                  <Text style={styles.axisLabel}>{item.axis}</Text>
                  <View style={styles.barPair}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${(item.before / 5) * 100}%`,
                            backgroundColor: palette.text3,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${(item.after / 5) * 100}%`,
                            backgroundColor: palette.accent,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.diffText,
                      {
                        color:
                          item.diff > 0
                            ? palette.accent
                            : item.diff < 0
                              ? palette.danger
                              : palette.text3,
                      },
                    ]}
                  >
                    {item.diff > 0
                      ? `+${item.diff}`
                      : item.diff === 0
                        ? "−"
                        : String(item.diff)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.card, styles.cardAccent]}>
              <Text style={[styles.sectionLabel, { color: palette.accent }]}>
                改善できた点
              </Text>
              {comparison.improvedPoints.map((point) => (
                <View key={point} style={styles.pointRow}>
                  <Ionicons name="checkmark" size={14} color={palette.accent} />
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>残課題</Text>
              {comparison.remainingPoints.map((point) => (
                <View key={point} style={styles.pointRow}>
                  <Text style={styles.remainingArrow}>→</Text>
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>総評</Text>
              <Text style={styles.body}>{comparison.comparisonSummary}</Text>
            </View>
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
    loading: {
      fontFamily: fonts.body,
      color: palette.text2,
      fontSize: 14,
      textAlign: "center",
      marginTop: 40,
    },
    pageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 10,
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
    badge: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
      letterSpacing: 1.1,
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
    emptyCard: {
      flex: 1,
      margin: 20,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 24,
      padding: 20,
      justifyContent: "center",
      gap: 10,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
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
    deltaCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
      backgroundColor: palette.surface2,
      borderRadius: 24,
      padding: 20,
    },
    deltaCol: {
      alignItems: "center",
      gap: 4,
    },
    deltaBefore: {
      fontFamily: fonts.heading,
      fontSize: 34,
      color: palette.text3,
    },
    deltaAfter: {
      fontFamily: fonts.heading,
      fontSize: 34,
      color: palette.accent,
    },
    deltaLabel: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
    },
    breakdownHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    breakdownLabel: {
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.text3,
      width: 32,
      textAlign: "center",
    },
    flexLabel: {
      flex: 1,
      textAlign: "left",
    },
    breakdownRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    axisLabel: {
      flex: 1,
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: palette.text,
    },
    barPair: {
      width: 120,
      gap: 6,
    },
    barTrack: {
      height: 6,
      backgroundColor: palette.border,
      borderRadius: 999,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 999,
    },
    diffText: {
      width: 28,
      fontFamily: fonts.mono,
      fontSize: 11,
      textAlign: "right",
    },
    sectionLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
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
    remainingArrow: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.text3,
      marginTop: 1,
    },
    body: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
  });
}
