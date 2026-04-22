import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  AppShell,
  Card,
  SectionTitle,
} from "../../../src/components/app-shell";
import { PrimaryButton } from "../../../src/components/primary-button";
import { ScoreList } from "../../../src/components/score-list";
import { getPracticeSession } from "../../../src/lib/storage";
import { palette } from "../../../src/lib/theme";
import type { PracticeSessionRecord } from "../../../src/shared/practice";

export default function FeedbackScreen() {
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

  if (!session) {
    return (
      <AppShell title="フィードバック" subtitle="読み込み中です。">
        <Card>
          <Text style={styles.body}>読み込み中...</Text>
        </Card>
      </AppShell>
    );
  }

  const latestAttempt = session.attempts.at(-1);
  if (!latestAttempt) {
    return (
      <AppShell title="フィードバック" subtitle="まだ回答がありません。">
        <Card>
          <Text style={styles.body}>まず録音して回答を送信してください。</Text>
          <PrimaryButton
            onPress={() =>
              router.replace({
                pathname: "/practice/[promptId]",
                params: {
                  promptId: session.prompt.id,
                  sessionId: session.id,
                },
              })
            }
          >
            録音に進む
          </PrimaryButton>
        </Card>
      </AppShell>
    );
  }

  const canRetry = session.attempts.length === 1;
  const canCompare = session.attempts.length >= 2;

  return (
    <AppShell
      title="フィードバック"
      subtitle={`${session.prompt.title} / Attempt ${latestAttempt.attemptNumber}`}
      right={
        <PrimaryButton variant="ghost" onPress={() => router.replace("/")}>
          ホーム
        </PrimaryButton>
      }
    >
      <Card tone="accent">
        <Text style={styles.summary}>{latestAttempt.evaluation.summary}</Text>
        <Text style={styles.body}>{latestAttempt.evaluation.transcript}</Text>
      </Card>

      <Card>
        <SectionTitle>5軸スコア</SectionTitle>
        <ScoreList evaluation={latestAttempt.evaluation} />
      </Card>

      <Card>
        <SectionTitle>良かった点</SectionTitle>
        {latestAttempt.evaluation.goodPoints.map((point) => (
          <Text key={point} style={styles.body}>
            ・{point}
          </Text>
        ))}
      </Card>

      <Card>
        <SectionTitle>改善ポイント</SectionTitle>
        {latestAttempt.evaluation.improvementPoints.map((point) => (
          <Text key={point} style={styles.body}>
            ・{point}
          </Text>
        ))}
        <Text style={styles.exampleLabel}>改善例</Text>
        <Text style={styles.body}>
          {latestAttempt.evaluation.exampleAnswer}
        </Text>
        <Text style={styles.focus}>
          次回の意識点: {latestAttempt.evaluation.nextFocus}
        </Text>
      </Card>

      <View style={styles.actions}>
        {canRetry ? (
          <PrimaryButton
            onPress={() =>
              router.replace({
                pathname: "/practice/[promptId]",
                params: {
                  promptId: session.prompt.id,
                  sessionId: session.id,
                },
              })
            }
          >
            もう一度回答する
          </PrimaryButton>
        ) : null}
        {canCompare ? (
          <PrimaryButton
            variant="ghost"
            onPress={() =>
              router.push({
                pathname: "/session/[sessionId]/comparison",
                params: { sessionId: session.id },
              })
            }
          >
            比較を見る
          </PrimaryButton>
        ) : null}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  summary: {
    color: palette.ink,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "800",
  },
  body: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  focus: {
    color: palette.accent,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  exampleLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  actions: {
    gap: 10,
  },
});
