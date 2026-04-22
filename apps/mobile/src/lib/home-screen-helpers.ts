import type {
  PersonalizationProfile,
  PersonalizedPracticePrompt,
  PracticeSessionRecord,
} from "@kotoba-gym/core";

export type HomePrompt = PersonalizedPracticePrompt;

export function isPersonalizedPrompt(
  prompt: HomePrompt,
): prompt is PersonalizedPracticePrompt {
  return "personalized" in prompt && prompt.personalized === true;
}

export function buildProfileHighlights(profile: PersonalizationProfile | null) {
  if (!profile) {
    return [];
  }

  return [profile.role, ...profile.techStack.slice(0, 2)];
}

export function getResumeSession(sessions: PracticeSessionRecord[]) {
  return sessions.find((session) => session.attempts.length === 1) ?? null;
}

export function buildResumeProgress(session: PracticeSessionRecord) {
  const completedAttempts = Math.min(session.attempts.length, 2);

  return {
    completedAttempts,
    totalAttempts: 2,
    ratio: completedAttempts / 2,
    label: `${completedAttempts}/2 回答済み`,
    focusText:
      session.attempts[0]?.evaluation.nextFocus ?? "次の回答に進みましょう",
  };
}

export function buildHomeFeed(params: {
  prompts: HomePrompt[];
  sessions: PracticeSessionRecord[];
  profile: PersonalizationProfile | null;
}) {
  const heroPrompt = params.prompts[0] ?? null;
  const candidatePrompts = params.prompts.slice(1, 9);

  return {
    heroPrompt,
    candidatePrompts,
    resumeSession: getResumeSession(params.sessions),
    showOnboardingCta: params.prompts.length === 0,
    shouldRedirectToOnboarding:
      !params.profile &&
      params.prompts.length === 0 &&
      params.sessions.length === 0,
    profileHighlights: buildProfileHighlights(params.profile),
    heroSectionLabel:
      params.profile && params.prompts.length > 0
        ? "あなた向けのおすすめ"
        : "おすすめのお題",
  };
}
