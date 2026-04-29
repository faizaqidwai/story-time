/**
 * GamesSection.jsx
 * app/gamification/components/GamesSection.jsx
 *
 * Renders below the Stories section in home.jsx.
 * Reads levelGames from GamificationContext and renders a GameCard per slot.
 * Shows a loading shimmer on first level visit, graceful empty state on error.
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
import UnlockModal from "./UnlockModal";
import CoinPromptModal from "./CoinPromptModal";
import LockedGameModal from "./LockedGameModal";

const TEAL = "#00BCD4";

export default function GamesSection() {
  const {
    levelGames,
    loadingGames,
    seedError,
    unlockModal,
    lockedModal,
    setLockedModal,
    coinPrompt,
    setCoinPrompt,
  } = useGamification();

  // ── Loading — only shown on first visit to a level ────────────────────────
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

  // ── Seed error — backend was unreachable on first visit ───────────────────
  if (seedError) {
    return (
      <View style={s.errorRow}>
        <Text style={s.errorText}>
          Games unavailable — check your connection
        </Text>
      </View>
    );
  }

  // ── No games configured for this level yet ────────────────────────────────
  if (!levelGames || levelGames.length === 0) {
    return null;
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {levelGames.map((slot) => (
          <GameCard key={slot.gameId} slot={slot} />
        ))}
      </ScrollView>

      {/* Modals — rendered here so they sit above Home's scroll content */}
      <UnlockModal />
      <CoinPromptModal />
      <LockedGameModal
        visible={!!lockedModal}
        storiesCompleted={lockedModal?.storiesCompleted ?? 0}
        onClose={() => setLockedModal(null)}
        onGoRead={() => setLockedModal(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  scrollContent: {
    paddingLeft:   15,
    paddingRight:  10,
    paddingBottom: 20,
  },
  loadingRow: {
    flexDirection:  "row",
    paddingLeft:    15,
    gap:            12,
    paddingBottom:  20,
  },
  shimmerCard: {
    width:           isTablet ? 220 : 160,
    height:          isTablet ? 270 : 200,
    borderRadius:    radius.xl,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth:     1,
    borderColor:     "rgba(0,188,212,0.15)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  errorRow: {
    paddingHorizontal: 15,
    paddingBottom:     20,
  },
  errorText: {
    fontFamily: FONTS.light,
    fontSize:   font.sm,
    color:      "rgba(255,255,255,0.35)",
  },
});
