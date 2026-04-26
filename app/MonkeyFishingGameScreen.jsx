/**
 * app/MonkeyFishingGame.jsx  — Expo Router route file
 *
 * This is the ONLY file needed for the game route.
 * The Stack.Screen animation is registered in _layout.jsx (see below).
 */

import { useRouter } from "expo-router";
import MonkeyFishingGame from "./MonkeyFishingGame";

export default function MonkeyFishingGameScreen() {
  const router = useRouter();
  return <MonkeyFishingGame onExit={() => router.back()} />;
}
