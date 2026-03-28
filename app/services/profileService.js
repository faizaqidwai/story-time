// app/services/profileService.js

import { apiClient } from "./apiClient";

export async function saveProfile(profile) {
  const payload = {
    id: profile.id || undefined,
    name: profile.name.trim(),
    age: parseInt(profile.age),
    gender: profile.gender,
    playLevel: parseInt(profile.playLevel),
  };
  return apiClient.post("/profile", payload);
}

export async function deleteProfileApi(profileId) {
  return apiClient.delete(`/profile/${profileId}`);
}
