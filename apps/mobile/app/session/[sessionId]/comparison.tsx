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

  const comparison = session.attempts[1]?.evaluation.comparison;
  const attempt1Scores = session.attempts[0]?.evaluation.scores;
  const attempt2Scores = session.attempts[1]?.evaluation.scores;
  const avg1 = attempt1Scores
    ? Math.round(
        (attempt1Scores.reduce((sum, item) => sum + item.score, 0) /
          attempt1Scores.length) *
          20,
      )
    : 0;
  const avg2 = attempt2Scores
    ? Math.round(
        (attempt2Scores.reduce((sum, item) => sum + item.score, 0) /
          attempt2Scores.length) *
          20,
      )
    : 0;

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
        <Text style={styles.subtitle}>Attempt 1 → Attempt 2</Text>

        {!comparison ? (
          <View style={styles.card}>
            <Text style={styles.body}>比較できるのは2回回答した後です。</Text>
          </View>
        ) : (
          <>
            <View style={styles.deltaCard}>
              <View style={styles.deltaCol}>
                <Text style={styles.deltaBefore}>{avg1}</Text>
                <Text style={styles.deltaLabel}>Attempt 1</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={palette.accent} />
              <View style={styles.deltaCol}>
                <Text style={styles.deltaAfter}>{avg2}</Text>
                <Text style={styles.deltaLabel}>Attempt 2</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownLabel, styles.flexLabel]}>
                  軸
                </Text>
                <Text style={styles.breakdownLabel}>1st</Text>
                <Text style={styles.breakdownLabel}>→</Text>
                <Text style={styles.breakdownLabel}>2nd</Text>
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
      color: palette.accentWarm,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      gap: 12,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: palette.text,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.text2,
    },
    emptyCard: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 12,
    },
    card: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 20,
      padding: 16,
      gap: 8,
    },
    body: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.danger,
    },
    deltaCard: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 18,
      backgroundColor: palette.surface2,
      borderRadius: 20,
      padding: 18,
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
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text2,
    },
    breakdownHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 4,
    },
    breakdownLabel: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
    },
    flexLabel: {
      flex: 1,
    },
    breakdownRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    axisLabel: {
      width: 94,
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.text2,
    },
    barPair: {
      flex: 1,
      gap: 6,
    },
    barTrack: {
      height: 8,
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
      textAlign: "right",
      fontFamily: fonts.monoMedium,
      fontSize: 12,
    },
    sectionLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: palette.text,
    },
    cardAccent: {
      backgroundColor: palette.accentDim,
      borderColor: palette.accentDim,
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
      color: palette.accentWarm,
    },
  });
}
