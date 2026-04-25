import type { SessionRecord } from "@kotoba-gym/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { generateFeedback, organizePackage } from "@/src/lib/api";
import { canRequestFeedback } from "@/src/lib/session-flow";
import { updateSession } from "@/src/lib/session-store";
import { useSession } from "@/src/lib/use-session";
import {
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
} from "@/src/ui/components";

type Step = "organize-package" | "feedback";

const loadingText: Record<Step, string> = {
  "organize-package": "整理結果を作っています",
  feedback: "今回の整理度を見ています",
};

export default function OrganizingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string; step?: Step }>();
  const sessionId = params.sessionId;
  const step = params.step ?? "organize-package";
  const { session, ownerKey, error, loading } = useSession(sessionId);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const currentSession = session;
    const currentOwnerKey = ownerKey;
    const currentSessionId = sessionId;
    if (!currentSession || !currentOwnerKey || !currentSessionId) {
      return;
    }

    async function run(
      readySession: SessionRecord,
      readyOwnerKey: string,
      readySessionId: string,
    ) {
      try {
        if (step === "organize-package") {
          const result = await organizePackage({
            rawInput: readySession.rawInput,
          });
          await updateSession(readySessionId, {
            ownerKey: readyOwnerKey,
            title: result.materials.title,
            materials: result.materials,
            conclusionCandidates: result.conclusionCandidates,
            selectedConclusion: result.selectedConclusion,
            speechPlan: result.speechPlan,
            script: result.script,
          });
          if (active) {
            router.replace({
              pathname: "/session/[sessionId]/result",
              params: { sessionId: readySessionId },
            });
          }
          return;
        }

        if (
          step === "feedback" &&
          canRequestFeedback(readySession) &&
          readySession.materials &&
          readySession.selectedConclusion &&
          readySession.speechPlan &&
          readySession.script &&
          readySession.rehearsal
        ) {
          const result = await generateFeedback({
            rawInput: readySession.rawInput,
            materials: readySession.materials,
            conclusion: readySession.selectedConclusion,
            speechPlan: readySession.speechPlan,
            script: readySession.script,
            rehearsal: readySession.rehearsal,
          });
          await updateSession(readySessionId, {
            ownerKey: readyOwnerKey,
            feedback: result.feedback,
          });
          if (active) {
            router.replace({
              pathname: "/session/[sessionId]/feedback",
              params: { sessionId: readySessionId },
            });
          }
          return;
        }

        throw new Error("前のステップの整理内容が足りません");
      } catch (e) {
        if (active) {
          setRunError(e instanceof Error ? e.message : "整理に失敗しました");
        }
      }
    }

    run(currentSession, currentOwnerKey, currentSessionId);
    return () => {
      active = false;
    };
  }, [ownerKey, router, session, sessionId, step]);

  return (
    <Screen>
      {loading ? <LoadingState text="整理を読み込んでいます" /> : null}
      {!loading && !runError && !error ? (
        <LoadingState text={loadingText[step]} />
      ) : null}
      {error || runError ? (
        <ErrorState
          message={error ?? runError ?? "処理に失敗しました"}
          action={
            <PrimaryButton onPress={() => router.back()}>戻る</PrimaryButton>
          }
        />
      ) : null}
    </Screen>
  );
}
