/**
 * GamesSection.jsx
 * app/gamification/components/GamesSection.jsx
 *
 * CHANGE: UnlockModal, CoinPromptModal and LockedGameModal removed from here.
 * They are now rendered in home.jsx so they work even when GamesSection
 * is hidden or removed from the screen.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

import { FONTS } from "../../theme";
import { font, pad, radius, isTablet } from "../../theme/tokens";
import { useGamification } from "../GamificationContext";
import GameCard from "./GameCard";

const TEAL = "#00BCD4";

export default function GamesSection() {
  const { levelGames, loadingGames, seedError } = useGamification();

  if (loadingGames) {
    return (
      <View style={s.loadingRow}>
        {[0, 1].map((i) => (
          <View key={i} style={s.shimmerCard}>
            <ActivityIndicator size="small" color={TEAL} />
          </View>
        ))}
      </View>
    );
  }

  if (seedError) {
    return (
      <View style={s.errorRow}>
        <Text style={s.errorText}>
          Games unavailable — check your connection
        </Text>
      </View>
    );
  }

  if (!levelGames || levelGames.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.scrollContent}
    >
      {levelGames.map((slot) => (
        <GameCard key={slot.gameId} slot={slot} />
      ))}
    </ScrollView>
  );
  // Modals (UnlockModal, CoinPromptModal, LockedGameModal) are now in home.jsx
}

const s = StyleSheet.create({
  scrollContent: {
    paddingLeft: 15,
    paddingRight: 10,
    paddingBottom: 20,
  },
  loadingRow: {
    flexDirection: "row",
    paddingLeft: 15,
    gap: 12,
    paddingBottom: 20,
  },
  shimmerCard: {
    width: isTablet ? 220 : 160,
    height: isTablet ? 270 : 200,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorRow: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  errorText: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: "rgba(255,255,255,0.35)",
  },
});
