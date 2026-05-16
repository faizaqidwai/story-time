/**
 * UnlockFlow.jsx
 * app/gamification/components/UnlockFlow.jsx
 *
 * CHANGES FROM PREVIOUS VERSION:
 *   ✅ MiniGameCard now shows the game's cover image when available
 *   ✅ Falls back to original animated-icon design when no cover exists
 *   ✅ All animation logic, diamond flight, panel transitions unchanged
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FONTS } from "../../theme";
import { font, pad, radius } from "../../theme/tokens";
import { GAME_ANIMATIONS } from "../constants/gameAnimations";
import ExpandedGameCard from "./ExpandedGameCard";
import GAME_COVERS from "../constants/gameCoverImages";

const { width: SW } = Dimensions.get("window");

const C = {
  teal: "#00BCD4",
  purple: "#B39DDB",
  purpleGlow: "rgba(179,157,219,0.35)",
  purpleBorder: "rgba(179,157,219,0.55)",
  yellow: "#FFD54F",
  yellowBorder: "rgba(255,213,79,0.6)",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
};

const COST = 9;
const DIAMOND_CNT = 9;

const CARD_PADDING = 22;
const ICON_BOX = 100;
const ARROW_ZONE = 56;
const GAP = 8;
const MODAL_W = Math.min(SW * 0.91, 420);
const CONTENT_W = MODAL_W - CARD_PADDING * 2;
const ROW_TOTAL = ICON_BOX + GAP + ARROW_ZONE + GAP + ICON_BOX;
const ROW_LEFT_X = (CONTENT_W - ROW_TOTAL) / 2;
const WALLET_CTR_X = ROW_LEFT_X + ICON_BOX / 2;
const GAME_CTR_X =
  ROW_LEFT_X + ICON_BOX + GAP + ARROW_ZONE + GAP + ICON_BOX / 2;
const GAME_CARD_START_X = GAME_CTR_X - CONTENT_W / 2;

// ─────────────────────────────────────────────────────────────────────────────
// FLYING DIAMOND (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function FlyingDiamond({ fromX, fromY, toX, toY, delay, onLand }) {
  const progress = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.6)).current;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [fromX - 14, toX - 14],
  });
  const peakY = Math.min(fromY, toY) - 110;
  const translateY = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [fromY - 14, peakY, toY - 14],
    extrapolate: "clamp",
  });

  useEffect(() => {
    const duration = 620 + Math.random() * 180;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(sc, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.timing(op, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
      onLand?.();
    });
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 28,
        height: 28,
        opacity: op,
        zIndex: 400,
        pointerEvents: "none",
        transform: [{ translateX }, { translateY }, { scale: sc }],
      }}
    >
      <ExpoImage
        source={require("../../../assets/img/diamond.png")}
        style={{ width: 28, height: 28 }}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI GAME CARD
// Shows cover image full-bleed when available; falls back to animated icon.
// ─────────────────────────────────────────────────────────────────────────────
function MiniGameCard({ slot, size = ICON_BOX }) {
  const gradient = slot?.gradient ?? ["#00BCD4", "#0097A7"];
  const MiniAnim = slot?.gameId ? GAME_ANIMATIONS[slot.gameId] : null;
  const coverSource = slot?.gameId ? (GAME_COVERS[slot.gameId] ?? null) : null;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.lg,
        overflow: "hidden",
      }}
    >
      {coverSource ? (
        // ── COVER IMAGE ─────────────────────────────────────────────────
        <>
          <ExpoImage
            source={coverSource}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {/* Very subtle dark overlay — keeps it feeling like a card, not a raw photo */}
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(8,8,26,0.12)",
            }}
          />
        </>
      ) : (
        // ── FALLBACK: original animated-icon design ──────────────────────
        <>
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: gradient[1] },
            ]}
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: gradient[0], height: "60%", opacity: 0.9 },
            ]}
          />
          <View
            style={{
              position: "absolute",
              width: 80,
              height: 80,
              borderRadius: 40,
              top: -20,
              right: -20,
              backgroundColor: "rgba(255,255,255,0.07)",
            }}
          />
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: 0.55 }],
            }}
          >
            {MiniAnim ? (
              <MiniAnim />
            ) : (
              <Text style={{ fontSize: 32 }}>{slot?.icon ?? "🎮"}</Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UNLOCK FLOW
// ─────────────────────────────────────────────────────────────────────────────
export default function UnlockFlow({
  slot,
  diamonds,
  onPlay,
  onCancel,
  confirmUnlock,
}) {
  const canAfford = diamonds >= COST;

  const [panel, setPanel] = useState("confirm");
  const [walletCount, setWalletCount] = useState(diamonds);
  const [gameCount, setGameCount] = useState(0);
  const [flyingDiamonds, setFlyingDiamonds] = useState([]);
  const landedRef = useRef(0);
  const rowLayoutRef = useRef(null);
  const containerRef = useRef(null);

  const walletScale = useRef(new Animated.Value(0)).current;
  const gameScale = useRef(new Animated.Value(0)).current;
  const walletPulse = useRef(new Animated.Value(1)).current;
  const walletShakeX = useRef(new Animated.Value(0)).current;
  const rowOp = useRef(new Animated.Value(0)).current;
  const walletPulseLoop = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(walletScale, {
        toValue: 1,
        friction: 5,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.spring(gameScale, {
        toValue: 1,
        friction: 5,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(rowOp, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      walletPulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(walletPulse, {
            toValue: 1.12,
            duration: 420,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(walletPulse, {
            toValue: 1.0,
            duration: 420,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      walletPulseLoop.current.start();
    });
    return () => walletPulseLoop.current?.stop();
  }, []);

  const spawnDiamonds = useCallback(() => {
    if (!rowLayoutRef.current || !containerRef.current) return;
    containerRef.current.measure((cx, cy, cw, ch, cpx, cpy) => {
      const rpy = rowLayoutRef.current?.rowPageY ?? cpy + 120;
      const rowY = rpy - cpy + ICON_BOX / 2;
      const fromX = WALLET_CTR_X + CARD_PADDING;
      const toX = GAME_CTR_X + CARD_PADDING;

      setFlyingDiamonds(
        Array.from({ length: DIAMOND_CNT }, (_, i) => ({
          id: i,
          fromX,
          fromY: rowY,
          toX,
          toY: rowY,
          delay: i * 140,
        })),
      );

      let wCount = diamonds;
      const wInterval = setInterval(() => {
        wCount -= 1;
        setWalletCount(Math.max(wCount, diamonds - COST));
        if (wCount <= diamonds - COST) clearInterval(wInterval);
      }, 140);

      let gCount = 0;
      const gInterval = setInterval(() => {
        gCount += 1;
        setGameCount(Math.min(gCount, COST));
        if (gCount >= COST) clearInterval(gInterval);
      }, 140);
    });
  }, [diamonds]);

  const handleCoinLand = useCallback(() => {
    landedRef.current += 1;
    Animated.sequence([
      Animated.timing(walletShakeX, {
        toValue: 6,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(walletShakeX, {
        toValue: -6,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(walletShakeX, {
        toValue: 0,
        duration: 45,
        useNativeDriver: true,
      }),
    ]).start();

    if (landedRef.current === DIAMOND_CNT) {
      walletPulseLoop.current?.stop();
      confirmUnlock?.(slot.gameId);
      setTimeout(() => {
        setFlyingDiamonds([]);
        Animated.timing(rowOp, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setPanel("done"));
      }, 400);
    }
  }, [confirmUnlock]);

  const handleConfirmTap = useCallback(() => {
    if (!canAfford) return;
    walletPulseLoop.current?.stop();
    setPanel("animating");
    spawnDiamonds();
  }, [canAfford, spawnDiamonds]);

  return (
    <View style={fl.container} ref={containerRef}>
      {flyingDiamonds.map((d) => (
        <FlyingDiamond key={d.id} {...d} onLand={handleCoinLand} />
      ))}

      <Text style={fl.heading}>
        {panel === "done" ? "🎉 Game Unlocked!" : "💎 Unlock This Game"}
      </Text>
      <Text style={fl.subHeading}>
        {panel === "confirm" &&
          (canAfford
            ? `Spend ${COST} 💎 to unlock forever`
            : "Not enough diamonds")}
        {panel === "animating" && "Transferring diamonds..."}
        {panel === "done" && "Play anytime — game is yours!"}
      </Text>
      <View style={fl.divider} />

      {(panel === "confirm" || panel === "animating") && (
        <Animated.View style={{ opacity: rowOp, width: "100%" }}>
          <View
            style={fl.rewardRow}
            onLayout={(e) => {
              e.target.measure((x, y, w, h, pageX, pageY) => {
                rowLayoutRef.current = {
                  ...rowLayoutRef.current,
                  rowPageY: pageY,
                };
              });
            }}
          >
            {/* Wallet */}
            <View style={fl.iconCol}>
              <Animated.View
                style={[
                  fl.iconBox,
                  fl.walletBox,
                  {
                    transform: [
                      { scale: Animated.multiply(walletScale, walletPulse) },
                    ],
                  },
                ]}
              >
                <ExpoImage
                  source={require("../../../assets/img/wallet.png")}
                  style={fl.boxImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
                <View style={fl.walletCounter}>
                  <ExpoImage
                    source={require("../../../assets/img/diamond.png")}
                    style={fl.counterIcon}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                  <Text style={fl.walletCounterText}>{walletCount}</Text>
                </View>
              </Animated.View>
              <Text style={fl.iconLabel}>Wallet</Text>
            </View>

            {/* Arrow trail */}
            <View style={fl.arrowTrail}>
              {[0, 1, 2].map((i) => (
                <Text
                  key={i}
                  style={[
                    fl.arrowChar,
                    { opacity: panel === "animating" ? 1 : 0.3 },
                  ]}
                >
                  ›
                </Text>
              ))}
            </View>

            {/* Game card — cover image when available */}
            <View style={fl.iconCol}>
              <Animated.View
                style={[
                  fl.iconBox,
                  {
                    transform: [
                      { scale: gameScale },
                      { translateX: walletShakeX },
                    ],
                  },
                ]}
              >
                <MiniGameCard slot={slot} size={ICON_BOX} />
                {gameCount > 0 && (
                  <View style={fl.gameCounter}>
                    <Text style={fl.gameCounterText}>+{gameCount}</Text>
                    <ExpoImage
                      source={require("../../../assets/img/diamond.png")}
                      style={fl.counterIcon}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  </View>
                )}
              </Animated.View>
              <Text style={fl.iconLabel}>Game</Text>
            </View>
          </View>

          {panel === "confirm" && (
            <View style={fl.btnRow}>
              <TouchableOpacity
                style={fl.cancelBtn}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={fl.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              {canAfford ? (
                <TouchableOpacity
                  style={fl.confirmBtn}
                  onPress={handleConfirmTap}
                  activeOpacity={0.85}
                >
                  <Text style={fl.confirmBtnText}>Unlock 💎 {COST}</Text>
                </TouchableOpacity>
              ) : (
                <View style={fl.cantAffordBox}>
                  <Text style={fl.cantAffordText}>
                    Need {COST - diamonds} more 💎
                  </Text>
                </View>
              )}
            </View>
          )}

          {panel === "animating" && (
            <Text style={fl.animatingHint}>
              ✨ Transferring {COST} diamonds...
            </Text>
          )}
        </Animated.View>
      )}

      {panel === "done" && (
        <ExpandedGameCard
          slot={slot}
          onPlay={onPlay}
          onDismiss={onCancel}
          startX={GAME_CARD_START_X}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
const fl = StyleSheet.create({
  container: { width: "100%", alignItems: "center", position: "relative" },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.textPri,
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: pad.xs,
    textShadowColor: C.purpleGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subHeading: {
    fontFamily: FONTS.regular,
    fontSize: font.md,
    color: C.textMuted,
    textAlign: "center",
    marginBottom: pad.sm,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(179,157,219,0.2)",
    marginBottom: pad.md,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GAP,
    paddingVertical: pad.xs,
  },
  iconCol: { alignItems: "center", gap: pad.s },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  walletBox: {
    backgroundColor: "rgba(179,157,219,0.12)",
    borderWidth: 2,
    borderColor: C.purpleBorder,
  },
  boxImage: { width: ICON_BOX * 0.72, height: ICON_BOX * 0.72 },
  iconLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    color: C.textMuted,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  walletCounter: {
    position: "absolute",
    top: -14,
    left: -10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(8,8,26,0.95)",
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: C.purpleBorder,
    paddingHorizontal: pad.s,
    paddingVertical: 3,
    zIndex: 10,
  },
  walletCounterText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.purple,
  },
  gameCounter: {
    position: "absolute",
    top: -14,
    right: -10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(8,8,26,0.95)",
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    paddingHorizontal: pad.s,
    paddingVertical: 3,
    zIndex: 10,
  },
  gameCounterText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.yellow,
  },
  counterIcon: { width: 18, height: 18 },
  arrowTrail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: -2,
    width: ARROW_ZONE,
    justifyContent: "center",
  },
  arrowChar: { fontFamily: FONTS.bold, fontSize: font.h3, color: C.purple },
  btnRow: {
    flexDirection: "row",
    gap: pad.sm,
    marginTop: pad.lg,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: pad.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  cancelBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: "rgba(255,255,255,0.55)",
  },
  confirmBtn: {
    flex: 1.5,
    paddingVertical: pad.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: C.purpleBorder,
    backgroundColor: "rgba(179,157,219,0.15)",
    alignItems: "center",
  },
  confirmBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.purple,
  },
  cantAffordBox: {
    flex: 1.5,
    paddingVertical: pad.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "rgba(239,83,80,0.4)",
    backgroundColor: "rgba(239,83,80,0.1)",
    alignItems: "center",
  },
  cantAffordText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: "#EF5350",
  },
  animatingHint: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: C.textMuted,
    textAlign: "center",
    marginTop: pad.lg,
    fontStyle: "italic",
  },
});
