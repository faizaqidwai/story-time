/**
 * app/features/levels/_layout.jsx
 *
 * Single layout that governs every screen inside features/levels/.
 * Gesture dismiss is disabled — each screen has its own exit button.
 *
 * Because this layout is nested inside the root app/_layout.jsx Stack,
 * Expo Router treats each file here as name="features/levels/<filename>" in the
 * root Stack. The root _layout.jsx Stack.Screen entries must use those
 * namespaced names.
 *
 */

import { Stack } from "expo-router";

export default function LevelLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen
        name="Levels"
        options={{
          headerShown: false,
          animation: "none",
          gestureEnabled: false,
          contentStyle: { backgroundColor: "#08081a" },
        }}
      />
    </Stack>
  );
}
