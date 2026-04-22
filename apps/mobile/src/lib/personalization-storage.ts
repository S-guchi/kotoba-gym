import { Directory, File, Paths } from "expo-file-system";
import {
  PersonalizationProfileSchema,
  PersonalizedPracticePromptSchema,
  type PersonalizationProfile,
  type PersonalizedPracticePrompt,
} from "@kotoba-gym/core";

const personalizationCache = new Map<
  "profile" | "prompts",
  PersonalizationProfile | PersonalizedPracticePrompt[] | null
>();

function rootDirectory() {
  const dir = new Directory(Paths.document, "kotoba-gym");
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

function profileFile() {
  return new File(rootDirectory(), "personalization-profile.json");
}

function promptsFile() {
  return new File(rootDirectory(), "personalized-prompts.json");
}

export async function getPersonalizationProfile() {
  const cached = personalizationCache.get("profile");
  if (cached !== undefined) {
    return cached as PersonalizationProfile | null;
  }

  const file = profileFile();
  if (!file.exists) {
    personalizationCache.set("profile", null);
    return null;
  }

  const parsed = PersonalizationProfileSchema.parse(
    JSON.parse(await file.text()),
  );
  personalizationCache.set("profile", parsed);
  return parsed;
}

export async function savePersonalizationProfile(
  profile: PersonalizationProfile,
) {
  const parsed = PersonalizationProfileSchema.parse(profile);
  await profileFile().write(JSON.stringify(parsed, null, 2));
  personalizationCache.set("profile", parsed);
}

export async function clearPersonalizationProfile() {
  const file = profileFile();
  if (file.exists) {
    file.delete();
  }
  personalizationCache.set("profile", null);
}

export async function getPersonalizedPrompts() {
  const cached = personalizationCache.get("prompts");
  if (cached !== undefined) {
    return cached as PersonalizedPracticePrompt[] | null;
  }

  const file = promptsFile();
  if (!file.exists) {
    personalizationCache.set("prompts", null);
    return null;
  }

  const parsed = PersonalizedPracticePromptSchema.array().parse(
    JSON.parse(await file.text()),
  );
  personalizationCache.set("prompts", parsed);
  return parsed;
}

export async function savePersonalizedPrompts(
  prompts: PersonalizedPracticePrompt[],
) {
  const parsed = PersonalizedPracticePromptSchema.array().parse(prompts);
  await promptsFile().write(JSON.stringify(parsed, null, 2));
  personalizationCache.set("prompts", parsed);
}

export async function clearPersonalizedPrompts() {
  const file = promptsFile();
  if (file.exists) {
    file.delete();
  }
  personalizationCache.set("prompts", null);
}

export async function resetPersonalization() {
  await Promise.all([
    clearPersonalizationProfile(),
    clearPersonalizedPrompts(),
  ]);
}
