/**
 * app/games/_layout.jsx
 *
 * Single layout that governs every screen inside features/stories/.
 * Gesture dismiss is disabled — each screen has its own exit button.
 *
 * Because this layout is nested inside the root app/_layout.jsx Stack,
 * Expo Router treats each file here as name="features/stories/<filename>" in the
 * root Stack. The root _layout.jsx Stack.Screen entries must use those
 * namespaced names (see _layout.diff below).
 *
 */

import { Stack } from "expo-router";
import { COLORS } from "../../theme";

export default function StoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen
        name="book/[id]"
        options={{
          headerShown: true,
          title: "Story",
          headerBackTitle: "",
          animation: "slide_from_right",
          headerStyle: { backgroundColor: COLORS.darkBg },
          headerTitleStyle: {
            color: COLORS.textPrimary,
            fontWeight: "bold",
          },
          headerTintColor: COLORS.teal,
        }}
      />

      <Stack.Screen
        name="book/[id]/read"
        options={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "#08081a" },
        }}
      />
    </Stack>
  );
}
