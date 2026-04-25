import type { ConclusionCandidate } from "@kotoba-gym/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { updateSession } from "@/src/lib/api";
import { useSession } from "@/src/lib/use-session";
import {
  Body,
  Card,
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
  Title,
} from "@/src/ui/components";
import { palette } from "@/src/ui/theme";

export default function ConclusionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const { session, ownerKey, error, loading } = useSession(sessionId);
  const [selected, setSelected] = useState<ConclusionCandidate | null>(null);

  async function handleNext() {
    if (!ownerKey || !sessionId || !selected) {
      return;
    }
    await updateSession(sessionId, { ownerKey, selectedConclusion: selected });
    router.push({
      pathname: "/session/[sessionId]/organizing",
      params: { sessionId, step: "plan" },
    });
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState text="結論候補を読み込んでいます" />
      </Screen>
    );
  }

  if (error || !session?.conclusionCandidates.length) {
    return (
      <Screen>
        <ErrorState message={error ?? "結論候補がまだありません"} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Title>一番伝えたいことはどれですか？</Title>
        <Body>近いものを選んでください。あとで言い回しは直せます。</Body>
      </View>

      {session.conclusionCandidates.map((candidate) => {
        const active = selected?.id === candidate.id;
        return (
          <Pressable
            accessibilityRole="button"
            key={candidate.id}
            onPress={() => setSelected(candidate)}
          >
            <Card
              style={{
                backgroundColor: active ? palette.accentSoft : palette.panel,
                borderColor: active ? palette.accent : palette.line,
              }}
            >
              <Text
                selectable
                style={{ color: palette.accent, fontWeight: "900" }}
              >
                {candidate.label}
              </Text>
              <Text
                selectable
                style={{ color: palette.ink, fontSize: 18, fontWeight: "800" }}
              >
                {candidate.text}
              </Text>
            </Card>
          </Pressable>
        );
      })}

      <PrimaryButton disabled={!selected} onPress={handleNext}>
        この結論で進める
      </PrimaryButton>
    </Screen>
  );
}
