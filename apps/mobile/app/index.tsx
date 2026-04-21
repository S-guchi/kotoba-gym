import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppShell, Card, SectionTitle } from "../src/components/app-shell";
import { PrimaryButton } from "../src/components/primary-button";
import { fetchPrompts } from "../src/lib/api";
import { createPracticeSession, listPracticeSessions } from "../src/lib/storage";
import { categoryLabels, palette } from "../src/lib/theme";
import type { PracticePrompt, PracticeSessionRecord } from "../src/shared/practice";

export default function HomeScreen() {
  const [prompts, setPrompts] = useState<PracticePrompt[]>([]);
  const [recentSessions, setRecentSessions] = useState<PracticeSessionRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [promptList, sessions] = await Promise.all([
          fetchPrompts(),
          listPracticeSessions(),
        ]);
        setPrompts(promptList);
        setRecentSessions(sessions.slice(0, 3));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = prompts.reduce<Record<string, PracticePrompt[]>>((acc, prompt) => {
    const key = prompt.category;
    acc[key] = [...(acc[key] ?? []), prompt];
    return acc;
  }, {});

  async function startPractice(prompt: PracticePrompt) {
    const session = await createPracticeSession(prompt);
    router.push({
      pathname: "/practice/[promptId]",
      params: {
        promptId: prompt.id,
        sessionId: session.id,
      },
    });
  }

  return (
    <AppShell
      title="話す前に、構造を鍛える。"
      subtitle="エンジニア向けの口頭言語化トレーニング。まず1本録って、AIの指摘でもう一度やり直します。"
      right={
        <PrimaryButton variant="ghost" onPress={() => router.push("/history")}>
          履歴
        </PrimaryButton>
      }
    >
      <Card tone="accent">
        <Text style={styles.heroTitle}>MVP Flow</Text>
        <Text style={styles.heroBody}>
          お題選択 → 録音 → フィードバック → 再挑戦 → 比較
        </Text>
      </Card>

      {recentSessions.length > 0 ? (
        <Card>
          <SectionTitle>直近の履歴</SectionTitle>
          {recentSessions.map((session) => (
            <Pressable
              key={session.id}
              onPress={() =>
                router.push({
                  pathname: "/session/[sessionId]/feedback",
                  params: { sessionId: session.id },
                })
              }
              style={styles.historyRow}
            >
              <Text style={styles.historyTitle}>{session.prompt.title}</Text>
              <Text style={styles.historyMeta}>
                {session.attempts.length}回回答 / {new Date(session.updatedAt).toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {error ? (
        <Card tone="warning">
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <View style={styles.groupList}>
        {Object.entries(grouped).map(([category, items]) => (
          <View key={category} style={styles.group}>
            <SectionTitle>
              {categoryLabels[category as keyof typeof categoryLabels]}
            </SectionTitle>
            {items.map((prompt) => (
              <Card key={prompt.id}>
                <Text style={styles.promptTitle}>{prompt.title}</Text>
                <Text style={styles.promptBody}>{prompt.prompt}</Text>
                <Text style={styles.promptSituation}>{prompt.situation}</Text>
                <PrimaryButton
                  disabled={loading}
                  onPress={() => {
                    void startPractice(prompt);
                  }}
                >
                  このお題で始める
                </PrimaryButton>
              </Card>
            ))}
          </View>
        ))}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  heroBody: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  groupList: {
    gap: 20,
  },
  group: {
    gap: 10,
  },
  promptTitle: {
    color: palette.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
  },
  promptBody: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  promptSituation: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  historyRow: {
    gap: 4,
    paddingVertical: 6,
  },
  historyTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  historyMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  errorText: {
    color: palette.warning,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
});

