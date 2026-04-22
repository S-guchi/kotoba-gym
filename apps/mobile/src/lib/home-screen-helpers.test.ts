import { describe, expect, test } from "vitest";
import type {
  PersonalizationProfile,
  PersonalizedPracticePrompt,
  PracticeSessionRecord,
} from "@kotoba-gym/core";
import {
  buildHomeFeed,
  buildProfileHighlights,
  buildResumeProgress,
  getResumeSession,
  isPersonalizedPrompt,
} from "./home-screen-helpers";

const personalizedPrompt: PersonalizedPracticePrompt = {
  id: "personalized-1",
  category: "interview",
  title: "Expo の強みを説明",
  prompt: "面接で強みを説明してください。",
  situation: "相手は実例を重視しています。",
  goals: ["強みを先に言う", "具体例で裏付ける"],
  durationLabel: "45〜60秒",
  personalized: true,
};

const profile: PersonalizationProfile = {
  role: "モバイル",
  roleText: "React Native 中心です",
  strengths: ["実装速度"],
  strengthsText: "",
  techStack: ["Expo", "TypeScript", "Supabase"],
  techStackText: "",
  scenarios: ["技術説明"],
};

const resumeSession: PracticeSessionRecord = {
  id: "session-1",
  prompt: personalizedPrompt,
  attempts: [
    {
      attemptNumber: 1,
      recordedAt: "2026-04-22T00:00:00.000Z",
      evaluation: {
        transcript: "回答です。",
        summary: "総評です。",
        scores: [
          { axis: "conclusion", score: 3, comment: "a" },
          { axis: "structure", score: 3, comment: "b" },
          { axis: "specificity", score: 3, comment: "c" },
          { axis: "technicalValidity", score: 3, comment: "d" },
          { axis: "brevity", score: 3, comment: "e" },
        ],
        goodPoints: ["結論がある"],
        improvementPoints: ["例が少ない"],
        exampleAnswer: "改善例です。",
        nextFocus: "具体例を追加する",
        comparison: null,
      },
    },
  ],
  createdAt: "2026-04-22T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

describe.each([
  {
    name: "profile highlights use role and first two stacks",
    input: profile,
    expected: ["モバイル", "Expo", "TypeScript"],
  },
  {
    name: "no profile yields empty highlights",
    input: null,
    expected: [],
  },
])("buildProfileHighlights", ({ input, expected }) => {
  test.each([{ label: "profile chips are derived deterministically" }])(
    "$label",
    () => {
      expect(buildProfileHighlights(input)).toEqual(expected);
    },
  );
});

describe.each([
  {
    name: "finds first resumable session",
    sessions: [resumeSession],
    expected: resumeSession.id,
  },
  {
    name: "returns null when no resumable session exists",
    sessions: [
      {
        ...resumeSession,
        attempts: [
          ...resumeSession.attempts,
          { ...resumeSession.attempts[0], attemptNumber: 2 },
        ],
      },
    ],
    expected: null,
  },
])("getResumeSession", ({ sessions, expected }) => {
  test.each([{ label: "resume session selection is stable" }])("$label", () => {
    expect(getResumeSession(sessions)?.id ?? null).toBe(expected);
  });
});

describe.each([
  {
    name: "resume progress uses existing attempt count",
    session: resumeSession,
    expected: {
      completedAttempts: 1,
      totalAttempts: 2,
      ratio: 0.5,
      label: "1/2 回答済み",
      focusText: "具体例を追加する",
    },
  },
])("buildResumeProgress", ({ session, expected }) => {
  test.each([{ label: "resume progress is deterministic" }])("$label", () => {
    expect(buildResumeProgress(session)).toEqual(expected);
  });
});

describe.each([
  {
    name: "personalized prompt is detected",
    prompt: personalizedPrompt,
    expected: true,
  },
])("isPersonalizedPrompt", ({ prompt, expected }) => {
  test.each([{ label: "personalization badge source is stable" }])(
    "$label",
    () => {
      expect(isPersonalizedPrompt(prompt)).toBe(expected);
    },
  );
});

describe.each([
  {
    name: "profile and prompts drive hero section",
    input: {
      prompts: [
        personalizedPrompt,
        { ...personalizedPrompt, id: "personalized-2", title: "別のお題" },
      ],
      sessions: [resumeSession],
      profile,
    },
    expected: {
      heroPromptId: "personalized-1",
      candidatePromptIds: ["personalized-2"],
      heroSectionLabel: "あなた向けのおすすめ",
      showOnboardingCta: false,
      shouldRedirectToOnboarding: false,
      resumeSessionId: "session-1",
    },
  },
  {
    name: "empty prompt list shows onboarding state",
    input: {
      prompts: [],
      sessions: [],
      profile: null,
    },
    expected: {
      heroPromptId: null,
      candidatePromptIds: [],
      heroSectionLabel: "おすすめのお題",
      showOnboardingCta: true,
      shouldRedirectToOnboarding: true,
      resumeSessionId: null,
    },
  },
  {
    name: "empty prompt list with profile keeps onboarding CTA without redirect",
    input: {
      prompts: [],
      sessions: [],
      profile,
    },
    expected: {
      heroPromptId: null,
      candidatePromptIds: [],
      heroSectionLabel: "おすすめのお題",
      showOnboardingCta: true,
      shouldRedirectToOnboarding: false,
      resumeSessionId: null,
    },
  },
])("buildHomeFeed", ({ input, expected }) => {
  test.each([{ label: "home feed sections are resolved deterministically" }])(
    "$label",
    () => {
      const resolved = buildHomeFeed(input);
      expect({
        heroPromptId: resolved.heroPrompt?.id ?? null,
        candidatePromptIds: resolved.candidatePrompts.map(
          (prompt) => prompt.id,
        ),
        heroSectionLabel: resolved.heroSectionLabel,
        showOnboardingCta: resolved.showOnboardingCta,
        shouldRedirectToOnboarding: resolved.shouldRedirectToOnboarding,
        resumeSessionId: resolved.resumeSession?.id ?? null,
      }).toEqual(expected);
    },
  );
});
