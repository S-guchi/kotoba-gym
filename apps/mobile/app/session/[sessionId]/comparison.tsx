import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppShell, Card, SectionTitle } from "../../../src/components/app-shell";
import { PrimaryButton } from "../../../src/components/primary-button";
import { getPracticeSession } from "../../../src/lib/storage";
import { palette } from "../../../src/lib/theme";
import type { PracticeSessionRecord } from "../../../src/shared/practice";

export default function ComparisonScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<PracticeSessionRecord | null>(null);

  useEffect(() => {
    void (async () => {
      if (!sessionId) {
        return;
      }
      setSession(await getPracticeSession(sessionId));
    })();
  }, [sessionId]);

  const comparison = session?.attempts[1]?.evaluation.comparison;

  return (
    <AppShell
      title="比較"
      subtitle="1回目と2回目の変化を並べて確認します。"
      right={
        <PrimaryButton variant="ghost" onPress={() => router.back()}>
          戻る
        </PrimaryButton>
      }
    >
      {!comparison ? (
        <Card>
          <Text style={styles.body}>比較できるのは2回回答した後です。</Text>
        </Card>
      ) : (
        <>
          <Card tone="accent">
            <Text style={styles.summary}>{comparison.comparisonSummary}</Text>
          </Card>

          <Card>
            <SectionTitle>スコア差分</SectionTitle>
            {comparison.scoreDiff.map((item) => (
              <Text key={item.axis} style={styles.body}>
                {item.axis}: {item.before} → {item.after} ({item.diff >= 0 ? "+" : ""}
                {item.diff})
              </Text>
            ))}
          </Card>

          <Card>
            <SectionTitle>改善した点</SectionTitle>
            {comparison.improvedPoints.map((item) => (
              <Text key={item} style={styles.body}>
                ・{item}
              </Text>
            ))}
          </Card>

          <Card>
            <SectionTitle>残課題</SectionTitle>
            {comparison.remainingPoints.map((item) => (
              <Text key={item} style={styles.body}>
                ・{item}
              </Text>
            ))}
          </Card>
        </>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  summary: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "800",
  },
  body: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 22,
  },
});
