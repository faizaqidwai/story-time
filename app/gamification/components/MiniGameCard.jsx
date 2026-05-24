/**
 * MiniGameCard.jsx
 * app/gamification/components/MiniGameCard.jsx
 *
 * FIX: TouchableOpacity now wraps the ENTIRE card from outside,
 * not inside overflow:hidden. This ensures touches are never clipped.
 *
 * CHANGES:
 *   - 3-segment progress bar replaced by 3 stars (⭐ yellow when earned)
 *   - Stars shown below card only when LOCKED
 *   - LevelFinishBox image uses finish-level.jpeg
 *   - Interactive press opens correct modal per state (same as full GameCard)
 *
 * SOURCE OF TRUTH — engine state only:
 *   slot.status                  LOCKED | REVEALED | UNLOCKED
 *   slot.storiesCompletedInGroup 0 | 1 | 2 → scratch states; 3 → REVEALED
 */

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import { Image as ExpoImage } from "expo-image";

import { FONTS } from "../../theme";
import { radius } from "../../theme/tokens";
import { GAME_STATUS } from "../GamificationEngine";
import { useGamification } from "../GamificationContext";
import GAME_COVERS from "../constants/gameCoverImages";
import ScratchCover from "./ScratchCover";

const TEAL = "#00BCD4";
const YELLOW = "#FFD54F";
const DARK = "#08081a";

const SIZES = {
  tracker: { card: 90, badge: 20, badgeFont: 9, starSize: 14 },
  arc: { card: 58, badge: 14, badgeFont: 7, starSize: 10 },
};

export const TRACKER_CARD_SIZE = SIZES.tracker.card;
export const ARC_CARD_SIZE = SIZES.arc.card;

// ─── Glow pulse hook ──────────────────────────────────────────────────────────
function useGlow(active) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      anim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active]);
  return anim;
}

// ─── 3 stars shown below card when LOCKED ─────────────────────────────────────
// Stars fill yellow as stories are completed (0, 1, 2, 3 filled)
function ProgressStars({ count, starSize }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 3,
        marginTop: 5,
        justifyContent: "center",
      }}
    >
      {[0, 1, 2].map((i) => {
        const filled = i < count;
        return (
          <Text
            key={i}
            style={{
              fontSize: starSize,
              color: filled ? YELLOW : "rgba(255,255,255,0.2)",
              // Glow on filled stars
              ...(filled && {
                textShadowColor: YELLOW,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 4,
              }),
            }}
          >
            ★
          </Text>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MiniGameCard({
  slot,
  size = "tracker",
  interactive = true,
}) {
  const { openLockedModal, openUnlockModal, startPlay } = useGamification();

  const {
    status,
    storiesCompletedInGroup,
    gameId,
    name,
    icon,
    gradient,
    accentColor,
  } = slot;

  const isLocked = status === GAME_STATUS.LOCKED;
  const isRevealed = status === GAME_STATUS.REVEALED;
  const isUnlocked = status === GAME_STATUS.UNLOCKED;

  const dim = SIZES[size] ?? SIZES.tracker;
  const CARD = dim.card;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const revealGlow = useGlow(isRevealed);
  const unlockGlow = useGlow(isUnlocked);

  // Scale animation on press — applied to entire wrapper
  const pressIn = () => {
    if (!interactive) return;
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };
  const pressOut = () => {
    if (!interactive) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!interactive) return;
    if (isLocked) openLockedModal(gameId, storiesCompletedInGroup);
    if (isRevealed) openUnlockModal(gameId);
    if (isUnlocked) startPlay(gameId);
  };

  const acc = accentColor ?? YELLOW;
  const coverSource = GAME_COVERS[gameId] ?? null;
  const g0 = gradient?.[0] ?? TEAL;
  const g1 = gradient?.[1] ?? "#1a1a2e";

  const borderColor = isRevealed
    ? revealGlow.interpolate({
        inputRange: [0, 1],
        outputRange: ["rgba(255,213,79,0.45)", "rgba(255,213,79,0.95)"],
      })
    : isUnlocked
      ? unlockGlow.interpolate({
          inputRange: [0, 1],
          outputRange: ["rgba(0,188,212,0.4)", "rgba(0,188,212,0.9)"],
        })
      : "rgba(255,255,255,0.08)";

  const shadowOpacity = isRevealed
    ? revealGlow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.75] })
    : isUnlocked
      ? unlockGlow.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.55] })
      : 0;

  // ── Card visual content (inside overflow:hidden) ───────────────────────────
  const CardVisual = (
    <Animated.View
      style={[
        {
          width: CARD,
          height: CARD,
          borderRadius: radius.md,
          overflow: "hidden",
          backgroundColor: DARK,
          borderWidth: 1.5,
          borderColor,
        },
        (isRevealed || isUnlocked) && {
          shadowColor: isRevealed ? YELLOW : TEAL,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity,
          shadowRadius: 10,
          elevation: 12,
        },
      ]}
    >
      {/* Full-bleed cover */}
      <View style={StyleSheet.absoluteFillObject}>
        {coverSource ? (
          <ExpoImage
            source={coverSource}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <>
            <View
              style={[StyleSheet.absoluteFillObject, { backgroundColor: g1 }]}
            />
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: g0, opacity: 0.65, height: "60%" },
              ]}
            />
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: CARD * 0.32 }}>{icon ?? "🎮"}</Text>
            </View>
          </>
        )}

        {/* LOCKED: scratch cover — no text overlay */}
        {isLocked && (
          <>
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: "rgba(8,8,26,0.3)" },
              ]}
            />
            <ScratchCover
              storiesCompleted={storiesCompletedInGroup}
              width={CARD}
              height={CARD}
            />
          </>
        )}

        {/* REVEALED / UNLOCKED: scrim + text overlay */}
        {!isLocked && (
          <>
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: CARD * 0.45,
                backgroundColor: "rgba(8,8,26,0.75)",
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: CARD * 0.07,
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.bold,
                  fontSize: CARD * 0.13,
                  color: "#fff",
                  letterSpacing: 0.1,
                }}
                numberOfLines={1}
              >
                {name}
              </Text>
              {isRevealed && (
                <View
                  style={{
                    backgroundColor: acc,
                    borderRadius: 20,
                    paddingHorizontal: CARD * 0.07,
                    paddingVertical: CARD * 0.03,
                    alignSelf: "flex-start",
                    marginTop: 2,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONTS.bold,
                      fontSize: CARD * 0.1,
                      color: DARK,
                    }}
                  >
                    Unlock 💎9
                  </Text>
                </View>
              )}
              {isUnlocked && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    marginTop: 2,
                  }}
                >
                  <ExpoImage
                    source={require("../../../assets/img/coin.png")}
                    style={{ width: CARD * 0.14, height: CARD * 0.14 }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                  <Text
                    style={{
                      fontFamily: FONTS.regular,
                      fontSize: CARD * 0.1,
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    100
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Badge top-right (rendered inside card for visual positioning) */}
      <View
        style={[
          s.badge,
          {
            top: 5,
            right: 5,
            width: dim.badge,
            height: dim.badge,
            borderRadius: dim.badge / 2,
            backgroundColor: DARK,
          },
        ]}
      >
        <Text style={{ fontSize: dim.badgeFont, color: YELLOW }}>
          {isLocked ? "🔒" : "▶"}
        </Text>
      </View>
    </Animated.View>
  );

  // ── Stars always shown below the card ────────────────────────────────────
  // LOCKED:            fill count = storiesCompletedInGroup (0, 1, 2)
  // REVEALED/UNLOCKED: goal achieved → all 3 stars filled
  const starCount = isLocked ? storiesCompletedInGroup : 3;
  const StarsBelow = (
    <ProgressStars count={starCount} starSize={dim.starSize} />
  );

  // ── Non-interactive version (arc goal marker) ─────────────────────────────
  if (!interactive) {
    return (
      <View style={{ alignItems: "center" }}>
        {CardVisual}
        {StarsBelow}
      </View>
    );
  }

  // ── Interactive: TouchableOpacity wraps OUTSIDE the Animated.View ─────────
  // This avoids the overflow:hidden clipping issue. The scale animation is on
  // an outer Animated.View so it scales both the card and the stars together.
  return (
    <Animated.View
      style={{ transform: [{ scale: scaleAnim }], alignItems: "center" }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={{ alignItems: "center" }}
      >
        {CardVisual}
        {StarsBelow}
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  badge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    zIndex: 5,
  },
  accentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.85,
    zIndex: 2,
  },
});
