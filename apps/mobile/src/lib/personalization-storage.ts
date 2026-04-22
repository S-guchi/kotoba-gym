import type {
  PersonalizationProfile,
  PersonalizedPracticePrompt,
} from "@kotoba-gym/core";
import {
  fetchPersonalizationProfile,
  fetchPrompts,
  resetPersonalization as resetPersonalizationOnServer,
  savePersonalizationProfile as savePersonalizationProfileOnServer,
} from "./api";

export async function getPersonalizationProfile() {
  return fetchPersonalizationProfile();
}

export async function savePersonalizationProfile(
  profile: PersonalizationProfile,
) {
  return savePersonalizationProfileOnServer(profile);
}

export async function getPersonalizedPrompts() {
  return fetchPrompts();
}

export async function savePersonalizedPrompts(
  prompts: PersonalizedPracticePrompt[],
) {
  return prompts;
}

export async function clearPersonalizedPrompts() {
  return;
}

export async function clearPersonalizationProfile() {
  return;
}

export async function resetPersonalization() {
  await resetPersonalizationOnServer();
}
