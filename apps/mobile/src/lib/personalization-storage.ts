import type { PersonalizationProfile } from "@kotoba-gym/core";
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

export async function resetPersonalization() {
  await resetPersonalizationOnServer();
}
