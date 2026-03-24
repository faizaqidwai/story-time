// app/services/profileService.js

import { apiClient } from "./apiClient";

export async function saveProfile(profile) {
  const payload = {
    id:    profile.id || undefined,
    name:  profile.name.trim(),
    age:   parseInt(profile.age),
    level: profile.readingLevel.toUpperCase(),
  };
  return apiClient.post("/profile", payload);
}

export async function deleteProfileApi(profileId) {
  return apiClient.delete(`/profile/${profileId}`);
}
