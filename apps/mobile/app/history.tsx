import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppShell, Card, SectionTitle } from "../src/components/app-shell";
import { PrimaryButton } from "../src/components/primary-button";
import { listPracticeSessions } from "../src/lib/storage";
import { palette } from "../src/lib/theme";
import type { PracticeSessionRecord } from "../src/shared/practice";

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);

  useEffect(() => {
    void listPracticeSessions().then(setSessions);
  }, []);

  return (
    <AppShell
      title="履歴"
      subtitle="端末に保存した練習結果を一覧で確認できます。"
      right={
        <PrimaryButton variant="ghost" onPress={() => router.back()}>
          戻る
        </PrimaryButton>
      }
    >
      <Card tone="accent">
        <Text style={styles.note}>
          音声ファイルは保存せず、文字起こしと評価結果だけを残しています。
        </Text>
      </Card>

      <View style={styles.list}>
        {sessions.length === 0 ? (
          <Card>
            <Text style={styles.empty}>まだ履歴はありません。</Text>
          </Card>
        ) : null}

        {sessions.map((session) => (
          <Card key={session.id}>
            <SectionTitle>{session.prompt.title}</SectionTitle>
            <Text style={styles.meta}>
              {session.attempts.length}回回答 / 更新{" "}
              {new Date(session.updatedAt).toLocaleString()}
            </Text>
            <PrimaryButton
              onPress={() =>
                router.push({
                  pathname: "/session/[sessionId]/feedback",
                  params: { sessionId: session.id },
                })
              }
            >
              詳細を見る
            </PrimaryButton>
          </Card>
        ))}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  note: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  empty: {
    color: palette.muted,
    fontSize: 14,
  },
  meta: {
    color: palette.muted,
    fontSize: 13,
  },
});
