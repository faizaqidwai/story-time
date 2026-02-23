// services/profileService.js
import { apiPost, apiFetch } from "./api";
import { getAccessToken } from "./tokenStorage";

export async function saveProfile(profile) {
  const accessToken = await getAccessToken();
  try {
    // Prepare request payload
    const payload = {
      id: profile.id || undefined, // undefined for new profile
      name: profile.name.trim(),
      age: parseInt(profile.age),
      level: profile.readingLevel.toUpperCase(), // convert to backend format
    };

    const response = await apiPost("/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    // Backend returns ProfileResponse
    return response;
  } catch (error) {
    console.error("Error saving profile:", error);
    throw error;
  }
}

export async function deleteProfileApi(profileId) {
  const accessToken = await getAccessToken();

  try {
    const response = await apiFetch(`/profile/${profileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response; // { message: "Profile deleted successfully" }
  } catch (error) {
    console.error("Error deleting profile:", error);
    throw error;
  }
}
