import type {
  PersonalizationProfile,
  PersonalizedPracticePrompt,
  PracticePrompt,
  PracticeSessionRecord,
} from "@kotoba-gym/core";

export type HomePrompt = PracticePrompt | PersonalizedPracticePrompt;

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
  defaultPrompts: PracticePrompt[];
  personalizedPrompts: PersonalizedPracticePrompt[];
  sessions: PracticeSessionRecord[];
  profile: PersonalizationProfile | null;
}) {
  const heroPrompt =
    params.personalizedPrompts[0] ?? params.defaultPrompts[0] ?? null;

  const seen = new Set<string>();
  if (heroPrompt) {
    seen.add(heroPrompt.id);
  }

  const candidatePrompts = [
    ...params.personalizedPrompts.slice(
      heroPrompt?.id === params.personalizedPrompts[0]?.id ? 1 : 0,
    ),
    ...params.defaultPrompts,
  ].filter((prompt) => {
    if (seen.has(prompt.id)) {
      return false;
    }
    seen.add(prompt.id);
    return true;
  });

  return {
    heroPrompt,
    candidatePrompts: candidatePrompts.slice(0, 8),
    resumeSession: getResumeSession(params.sessions),
    showOnboardingCta: params.profile === null,
    profileHighlights: buildProfileHighlights(params.profile),
    heroSectionLabel:
      params.profile && params.personalizedPrompts.length > 0
        ? "あなた向けのおすすめ"
        : "おすすめのお題",
  };
}
