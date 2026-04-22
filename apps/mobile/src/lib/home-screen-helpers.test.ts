import { describe, expect, test } from "vitest";
import type {
  PersonalizationProfile,
  PersonalizedPracticePrompt,
  PracticePrompt,
  PracticeSessionRecord,
} from "@kotoba-gym/core";
import {
  buildHomeFeed,
  buildProfileHighlights,
  buildResumeProgress,
  getResumeSession,
  isPersonalizedPrompt,
} from "./home-screen-helpers";

const basePrompt: PracticePrompt = {
  id: "base-1",
  category: "interview",
  title: "自分の強みの説明",
  prompt: "面接で強みを説明してください。",
  situation: "相手は実例を重視しています。",
  goals: ["強みを先に言う", "具体例で裏付ける"],
  durationLabel: "45〜60秒",
};

const personalizedPrompt: PersonalizedPracticePrompt = {
  ...basePrompt,
  id: "personalized-1",
  title: "Expo の強みを説明",
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
  prompt: basePrompt,
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
  {
    name: "base prompt is not personalized",
    prompt: basePrompt,
    expected: false,
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
    name: "profile and personalized prompts drive hero section",
    input: {
      defaultPrompts: [
        basePrompt,
        { ...basePrompt, id: "base-2", title: "別のお題" },
      ],
      personalizedPrompts: [personalizedPrompt],
      sessions: [resumeSession],
      profile,
    },
    expected: {
      heroPromptId: "personalized-1",
      candidatePromptIds: ["base-1", "base-2"],
      heroSectionLabel: "あなた向けのおすすめ",
      showOnboardingCta: false,
      resumeSessionId: "session-1",
    },
  },
  {
    name: "fallback uses base prompts when profile is missing",
    input: {
      defaultPrompts: [
        basePrompt,
        { ...basePrompt, id: "base-2", title: "別のお題" },
      ],
      personalizedPrompts: [],
      sessions: [],
      profile: null,
    },
    expected: {
      heroPromptId: "base-1",
      candidatePromptIds: ["base-2"],
      heroSectionLabel: "おすすめのお題",
      showOnboardingCta: true,
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
        resumeSessionId: resolved.resumeSession?.id ?? null,
      }).toEqual(expected);
    },
  );
});
