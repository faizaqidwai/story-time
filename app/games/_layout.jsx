/**
 * app/games/_layout.jsx
 *
 * Single layout that governs every screen inside app/games/.
 * All games slide up from the bottom and have no header.
 * Gesture dismiss is disabled — each game has its own exit button.
 *
 * Because this layout is nested inside the root app/_layout.jsx Stack,
 * Expo Router treats each file here as name="games/<filename>" in the
 * root Stack. The root _layout.jsx Stack.Screen entries must use those
 * namespaced names (see _layout.diff below).
 *
 * MonkeyFishingGame is the only game with a separate component file.
 * Its component lives at app/games/_components/MonkeyFishingGame.jsx
 * and is imported by app/games/MonkeyFishingGame.jsx (the route file).
 * Expo Router ignores folders that start with _ so _components/ is
 * never treated as a route.
 */

import { Stack } from "expo-router";

export default function GamesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_bottom",
        gestureEnabled: false,
      }}
    />
  );
}
