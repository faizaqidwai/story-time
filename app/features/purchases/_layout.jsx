/**
 * app/features/purchases/_layout.jsx
 *
 * Single layout that governs every screen inside features/purchases/.
 * Gesture dismiss is disabled — each screen has its own exit button.
 *
 * Because this layout is nested inside the root app/_layout.jsx Stack,
 * Expo Router treats each file here as name="features/purchases/<filename>" in the
 * root Stack. The root _layout.jsx Stack.Screen entries must use those
 * namespaced names.
 *
 */

import { Stack } from "expo-router";

export default function PurchaseLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#08081a" },
      }}
    />
  );
}
