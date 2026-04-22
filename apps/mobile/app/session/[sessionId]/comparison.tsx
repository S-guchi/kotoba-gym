import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../../../src/components/primary-button";
import { Tag } from "../../../src/components/tag";
import { getPracticeSession } from "../../../src/lib/storage";
import { fonts, palette } from "../../../src/lib/theme";
import type { PracticeSessionRecord } from "../../../src/shared/practice";

export default function ComparisonScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<PracticeSessionRecord | null>(null);

  useEffect(() => {
    void (async () => {
      if (!sessionId) return;
      setSession(await getPracticeSession(sessionId));
    })();
  }, [sessionId]);

  const comparison = session?.attempts[1]?.evaluation.comparison;

  const attempt1Scores = session?.attempts[0]?.evaluation.scores;
  const attempt2Scores = session?.attempts[1]?.evaluation.scores;
  const avg1 = attempt1Scores
    ? Math.round(
        attempt1Scores.reduce((s, x) => s + x.score, 0) /
          attempt1Scores.length *
          20,
      )
    : 0;
  const avg2 = attempt2Scores
    ? Math.round(
        attempt2Scores.reduce((s, x) => s + x.score, 0) /
          attempt2Scores.length *
          20,
      )
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={palette.text2} />
          <Text style={styles.backText}>ホーム</Text>
        </Pressable>
        <Tag label="比較" variant="warm" />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{session?.prompt.title ?? "—"}</Text>
        <Text style={styles.subtitle}>Attempt 1 → Attempt 2</Text>

        {!comparison ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              比較できるのは2回回答した後です。
            </Text>
          </View>
        ) : (
          <>
            {/* Score delta */}
            <View style={styles.deltaCard}>
              <View style={styles.deltaCol}>
                <Text style={styles.deltaBefore}>{avg1}</Text>
                <Text style={styles.deltaLabel}>Attempt 1</Text>
              </View>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={palette.accent}
              />
              <View style={styles.deltaCol}>
                <Text style={styles.deltaAfter}>{avg2}</Text>
                <Text style={styles.deltaLabel}>Attempt 2</Text>
              </View>
            </View>

            {/* Score breakdown */}
            <View style={styles.card}>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownLabel, { flex: 1 }]}>軸</Text>
                <Text style={[styles.breakdownLabel, { color: palette.text2 }]}>
                  1st
                </Text>
                <Text style={styles.breakdownLabel}>→</Text>
                <Text
                  style={[styles.breakdownLabel, { color: palette.accent }]}
                >
                  2nd
                </Text>
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
                    {item.diff > 0 ? `+${item.diff}` : item.diff === 0 ? "−" : String(item.diff)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Improved points */}
            <View style={[styles.card, styles.cardAccent]}>
              <Text style={[styles.sectionLabel, { color: palette.accent }]}>
                改善できた点
              </Text>
              {comparison.improvedPoints.map((point) => (
                <View key={point} style={styles.pointRow}>
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={palette.accent}
                  />
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>

            {/* Remaining */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>残課題</Text>
              {comparison.remainingPoints.map((point) => (
                <View key={point} style={styles.pointRow}>
                  <Text style={{ color: palette.accentWarm }}>→</Text>
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>

            {/* Summary */}
            <View style={[styles.card, styles.cardSurface2]}>
              <Text style={styles.compSummary}>
                {comparison.comparisonSummary}
              </Text>
            </View>
          </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton onPress={() => router.replace("/")}>
            ホームへ戻る
          </PrimaryButton>
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
    gap: 14,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: palette.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.text3,
    marginBottom: 6,
  },
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 14,
  },
  cardAccent: {
    backgroundColor: palette.accentDim,
    borderColor: "rgba(110,184,154,0.2)",
  },
  cardSurface2: {
    backgroundColor: palette.surface2,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.text,
    lineHeight: 22,
  },
  deltaCard: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  deltaCol: {
    flex: 1,
    alignItems: "center",
  },
  deltaBefore: {
    fontFamily: fonts.mono,
    fontSize: 32,
    color: palette.text2,
  },
  deltaAfter: {
    fontFamily: fonts.mono,
    fontSize: 32,
    color: palette.accent,
  },
  deltaLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: palette.text3,
    marginTop: 2,
  },
  breakdownHeader: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  breakdownLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: palette.text3,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  axisLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.text,
    minWidth: 56,
  },
  barPair: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  barTrack: {
    flex: 1,
    height: 4,
    backgroundColor: palette.borderLight,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  diffText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    minWidth: 24,
    textAlign: "right",
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
  pointRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
    alignItems: "flex-start",
  },
  pointText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.text,
    lineHeight: 20,
    flex: 1,
  },
  compSummary: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.text2,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
    marginTop: 10,
  },
});
