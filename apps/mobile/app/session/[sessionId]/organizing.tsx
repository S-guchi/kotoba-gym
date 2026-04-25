import type { SessionRecord } from "@kotoba-gym/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  generateConclusions,
  generateFeedback,
  generateScript,
  generateSpeechPlan,
  organize,
  updateSession,
} from "@/src/lib/api";
import { useSession } from "@/src/lib/use-session";
import {
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
} from "@/src/ui/components";

type Step = "organize" | "conclusions" | "plan" | "script" | "feedback";

const loadingText: Record<Step, string> = {
  organize: "考えを整理しています",
  conclusions: "結論候補を作っています",
  plan: "伝える順番を組み立てています",
  script: "30秒説明を作っています",
  feedback: "今回の整理度を見ています",
};

export default function OrganizingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string; step?: Step }>();
  const sessionId = params.sessionId;
  const step = params.step ?? "organize";
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
        if (step === "organize") {
          const result = await organize({
            scene: readySession.scene,
            rawInput: readySession.rawInput,
          });
          await updateSession(readySessionId, {
            ownerKey: readyOwnerKey,
            title: result.materials.title,
            materials: result.materials,
          });
          if (active) {
            router.replace({
              pathname: "/session/[sessionId]/materials",
              params: { sessionId: readySessionId },
            });
          }
          return;
        }

        if (step === "conclusions" && readySession.materials) {
          const result = await generateConclusions({
            scene: readySession.scene,
            rawInput: readySession.rawInput,
            materials: readySession.materials,
          });
          await updateSession(readySessionId, {
            ownerKey: readyOwnerKey,
            conclusionCandidates: result.candidates,
          });
          if (active) {
            router.replace({
              pathname: "/session/[sessionId]/conclusion",
              params: { sessionId: readySessionId },
            });
          }
          return;
        }

        if (
          step === "plan" &&
          readySession.materials &&
          readySession.selectedConclusion
        ) {
          const result = await generateSpeechPlan({
            scene: readySession.scene,
            materials: readySession.materials,
            conclusion: readySession.selectedConclusion,
          });
          await updateSession(readySessionId, {
            ownerKey: readyOwnerKey,
            speechPlan: result.speechPlan,
          });
          if (active) {
            router.replace({
              pathname: "/session/[sessionId]/plan",
              params: { sessionId: readySessionId },
            });
          }
          return;
        }

        if (
          step === "script" &&
          readySession.materials &&
          readySession.selectedConclusion &&
          readySession.speechPlan
        ) {
          const result = await generateScript({
            scene: readySession.scene,
            materials: readySession.materials,
            conclusion: readySession.selectedConclusion,
            speechPlan: readySession.speechPlan,
          });
          await updateSession(readySessionId, {
            ownerKey: readyOwnerKey,
            script: result.script,
          });
          if (active) {
            router.replace({
              pathname: "/session/[sessionId]/script",
              params: { sessionId: readySessionId },
            });
          }
          return;
        }

        if (
          step === "feedback" &&
          readySession.selectedConclusion &&
          readySession.speechPlan &&
          readySession.script &&
          readySession.rehearsal
        ) {
          const result = await generateFeedback({
            rawInput: readySession.rawInput,
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
