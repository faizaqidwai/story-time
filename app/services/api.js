import { API_CONFIG } from "../config/apiConfig";

export async function apiPost(endpoint, options = {}) {
  console.log("===== API REQUEST =====");
  console.log("URL:", endpoint);
  console.log("Method:", options.method || "GET");
  console.log("Headers:", options.headers);
  console.log("Body:", options.body);

  const res = await fetch(`${API_CONFIG.BASE_URL_API}${endpoint}`, options);

  if (!res.ok) {
    console.log("ERROR RESPONSE:", res);
    throw new Error("API Error");
  }
  const data = await res.json();

  console.log("RESPONSE DATA:", JSON.stringify(data));
  return data;
}

export async function cdnFetch(endpoint) {
  console.log("===== API REQUEST =====");
  console.log("URL:", endpoint);
  const res = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`);

  if (!res.ok) {
    console.log("ERROR RESPONSE:", res);
    throw new Error("API Error");
  }
  const data = await res.json();

  console.log("RESPONSE DATA:", JSON.stringify(data));
  return data;
}

export async function apiFetch(endpoint, options = {}) {
  console.log("===== API REQUEST =====");
  console.log("URL:", endpoint);
  console.log("Method:", options.method || "GET");
  console.log("Headers:", options.headers);
  const res = await fetch(`${API_CONFIG.BASE_URL_API}${endpoint}`, options);
  console.log("RESPONSE:", res);
  if (!res.ok) {
    console.log("ERROR RESPONSE:", res);
    throw new Error("API Error");
  }
  const data = await res.json(); // ✅ read ONCE

  //console.log("RESPONSE DATA:", JSON.stringify(data));
  return data;
}
