/**
 * app/games/MonkeyFishingGame.jsx
 *
 * Expo Router route file for the Monkey Fishing game.
 * Animation and header are handled by app/games/_layout.jsx — no
 * Stack.Screen override needed here.
 *
 * The game component lives at app/games/_components/MonkeyFishingGame.jsx.
 * Expo Router ignores _components/ (underscore prefix = not a route).
 */

import { useRouter } from "expo-router";
import MonkeyFishingGame from "./_components/MonkeyFishingGame";

export default function MonkeyFishingGameScreen() {
  const router = useRouter();
  return <MonkeyFishingGame onExit={() => router.back()} />;
}
