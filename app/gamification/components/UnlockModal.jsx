/**
 * UnlockModal.jsx
 * app/gamification/components/UnlockModal.jsx
 *
 * Panel "confirm"   — wallet box + game card box side by side, Confirm CTA
 * Panel "animating" — 9 diamonds fly from wallet → game card with counters
 * Panel "done"      — ExpandedGameCard slides from right to center + grows
 *
 * confirmUnlock fires only AFTER the animation completes.
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
  Modal,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FONTS } from "../../theme";
import { font, pad, radius } from "../../theme/tokens";
import { useGamification } from "../GamificationContext";
import { useUser } from "../../_contexts/UserContext";
import { GAME_ANIMATIONS } from "../constants/gameAnimations";
import ExpandedGameCard from "./ExpandedGameCard";
import GAME_COVERS from "../constants/gameCoverImages";

const { width: SW, height: SH } = Dimensions.get("window");

const C = {
  bg: "rgba(8,8,26,0.97)",
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
const ROW_TOTAL = ICON_BOX + GAP + ARROW_ZONE + GAP + ICON_BOX;
const MODAL_W = Math.min(SW * 0.91, 420);
const CONTENT_W = MODAL_W - CARD_PADDING * 2;
const ROW_LEFT_X = (CONTENT_W - ROW_TOTAL) / 2 + CARD_PADDING;
const WALLET_CTR_X = ROW_LEFT_X + ICON_BOX / 2;
const GAME_CTR_X =
  ROW_LEFT_X + ICON_BOX + GAP + ARROW_ZONE + GAP + ICON_BOX / 2;
const GAME_CARD_START_X = GAME_CTR_X - MODAL_W / 2;

// ─────────────────────────────────────────────────────────────────────────────
// FLYING DIAMOND
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
// ─────────────────────────────────────────────────────────────────────────────
function MiniGameCard({ slot, size: boxSize = ICON_BOX }) {
  const gradient = slot?.gradient ?? ["#00BCD4", "#0097A7"];
  const MiniAnim = slot?.gameId ? GAME_ANIMATIONS[slot.gameId] : null;
  const coverSource = slot?.gameId ? (GAME_COVERS[slot.gameId] ?? null) : null;

  return (
    <View
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: radius.lg,
        overflow: "hidden",
      }}
    >
      {coverSource ? (
        // Cover image — same as GameCard and ScratchGameCard
        <>
          <ExpoImage
            source={coverSource}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(8,8,26,0.08)",
            }}
          />
        </>
      ) : (
        // Fallback — original gradient + circles + mini animation
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
// MAIN MODAL
// ─────────────────────────────────────────────────────────────────────────────
export default function UnlockModal() {
  const { unlockModal, setUnlockModal, confirmUnlock } = useGamification();
  const { currentProfile } = useUser();

  const visible = !!unlockModal;
  const gameId = unlockModal?.gameId ?? null;
  const slot = unlockModal?.slot ?? null;
  const diamonds = currentProfile?.diamonds ?? 0;
  const canAfford = diamonds >= COST;

  const [panel, setPanel] = useState("confirm");
  const [walletCount, setWalletCount] = useState(diamonds);
  const [gameCount, setGameCount] = useState(0);
  const [flyingDiamonds, setFlyingDiamonds] = useState([]);
  const landedRef = useRef(0);
  const cardLayoutRef = useRef(null);

  const sheetY = useRef(new Animated.Value(SH)).current;
  const scrOp = useRef(new Animated.Value(0)).current;
  const wasVisible = useRef(false);
  const walletScale = useRef(new Animated.Value(0)).current;
  const gameScale = useRef(new Animated.Value(0)).current;
  const walletPulse = useRef(new Animated.Value(1)).current;
  const walletShakeX = useRef(new Animated.Value(0)).current;
  const rowOp = useRef(new Animated.Value(0)).current;
  const walletPulseLoop = useRef(null);

  const reset = useCallback(() => {
    setPanel("confirm");
    setWalletCount(diamonds);
    setGameCount(0);
    setFlyingDiamonds([]);
    landedRef.current = 0;
    cardLayoutRef.current = null;
    walletScale.setValue(0);
    gameScale.setValue(0);
    walletPulse.setValue(1);
    walletShakeX.setValue(0);
    rowOp.setValue(0);
    walletPulseLoop.current?.stop();
  }, [diamonds]);

  useEffect(() => {
    if (!visible) {
      if (!wasVisible.current) return;
      wasVisible.current = false;
      Animated.parallel([
        Animated.timing(sheetY, {
          toValue: SH,
          duration: 350,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scrOp, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(() => reset());
      return;
    }
    wasVisible.current = true;
    reset();
    sheetY.setValue(SH);
    scrOp.setValue(0);

    Animated.parallel([
      Animated.timing(scrOp, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(sheetY, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start((r) => {
      if (!r.finished) return;
      setTimeout(() => {
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
      }, 200);
    });
  }, [visible]);

  const spawnDiamonds = useCallback(() => {
    if (!cardLayoutRef.current) return;
    const { cardY, cardX } = cardLayoutRef.current;
    const rowY = cardY + 185;
    const fromX = (cardX ?? 0) + WALLET_CTR_X;
    const toX = (cardX ?? 0) + GAME_CTR_X;

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
      confirmUnlock(gameId);
      setTimeout(() => {
        setFlyingDiamonds([]);
        Animated.timing(rowOp, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setPanel("done"));
      }, 400);
    }
  }, [gameId, confirmUnlock]);

  const handleConfirmTap = useCallback(() => {
    if (!canAfford) return;
    walletPulseLoop.current?.stop();
    setPanel("animating");
    spawnDiamonds();
  }, [canAfford, spawnDiamonds]);

  const handleCancel = useCallback(() => {
    walletPulseLoop.current?.stop();
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: SH,
        duration: 380,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scrOp, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setTimeout(() => setUnlockModal(null), 100));
  }, [setUnlockModal]);

  const handlePlay = useCallback(() => handleCancel(), [handleCancel]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleCancel}
    >
      <View style={s.shell} pointerEvents="box-none">
        <Animated.View
          style={[s.scrim, { opacity: scrOp }]}
          pointerEvents="none"
        />

        {flyingDiamonds.map((d) => (
          <FlyingDiamond key={d.id} {...d} onLand={handleCoinLand} />
        ))}

        <Animated.View
          style={[s.sheet, { transform: [{ translateY: sheetY }] }]}
          onLayout={(e) => {
            const { y, x } = e.nativeEvent.layout;
            cardLayoutRef.current = { cardY: y, cardX: x };
          }}
        >
          <View style={s.handle} />
          <Text style={s.heading}>
            {panel === "done" ? "🎉 Game Unlocked!" : "💎 Unlock This Game"}
          </Text>
          <Text style={s.subHeading}>
            {panel === "confirm" &&
              (canAfford
                ? `Spend ${COST} 💎 to unlock forever`
                : "Not enough diamonds")}
            {panel === "animating" && "Transferring diamonds..."}
            {panel === "done" && "Play anytime — game is yours!"}
          </Text>
          <View style={s.divider} />

          {(panel === "confirm" || panel === "animating") && (
            <Animated.View style={{ opacity: rowOp, width: "100%" }}>
              <View style={s.rewardRow}>
                <View style={s.iconCol}>
                  <Animated.View
                    style={[
                      s.iconBox,
                      s.walletBox,
                      {
                        transform: [
                          {
                            scale: Animated.multiply(walletScale, walletPulse),
                          },
                        ],
                      },
                    ]}
                  >
                    <ExpoImage
                      source={require("../../../assets/img/wallet.png")}
                      style={s.boxImage}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                    <View style={s.walletCounter}>
                      <ExpoImage
                        source={require("../../../assets/img/diamond.png")}
                        style={s.counterIcon}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                      <Text style={s.walletCounterText}>{walletCount}</Text>
                    </View>
                  </Animated.View>
                  <Text style={s.iconLabel}>Your Wallet</Text>
                </View>

                <View style={s.arrowTrail}>
                  {[0, 1, 2].map((i) => (
                    <Text
                      key={i}
                      style={[
                        s.arrowChar,
                        { opacity: panel === "animating" ? 1 : 0.3 },
                      ]}
                    >
                      ›
                    </Text>
                  ))}
                </View>

                <View style={s.iconCol}>
                  <Animated.View
                    style={[
                      s.iconBox,
                      s.gameBox,
                      {
                        transform: [
                          { scale: gameScale },
                          { translateX: walletShakeX },
                        ],
                      },
                    ]}
                  >
                    <MiniGameCard slot={slot ?? unlockModal} size={ICON_BOX} />
                    {gameCount > 0 && (
                      <View style={s.gameCounter}>
                        <Text style={s.gameCounterText}>+{gameCount}</Text>
                        <ExpoImage
                          source={require("../../../assets/img/diamond.png")}
                          style={s.counterIcon}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      </View>
                    )}
                  </Animated.View>
                  <Text style={s.iconLabel}>Game</Text>
                </View>
              </View>

              {panel === "confirm" && (
                <View style={s.btnRow}>
                  <TouchableOpacity
                    style={s.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  {canAfford ? (
                    <TouchableOpacity
                      style={s.confirmBtn}
                      onPress={handleConfirmTap}
                      activeOpacity={0.85}
                    >
                      <Text style={s.confirmBtnText}>Unlock 💎 {COST}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.cantAffordBox}>
                      <Text style={s.cantAffordText}>
                        Need {COST - diamonds} more 💎
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {panel === "animating" && (
                <Text style={s.animatingHint}>
                  ✨ Transferring {COST} diamonds...
                </Text>
              )}
            </Animated.View>
          )}

          {panel === "done" && (
            <ExpandedGameCard
              slot={slot ?? unlockModal}
              onPlay={handlePlay}
              onDismiss={handleCancel}
              startX={GAME_CARD_START_X}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const SHEET_HEIGHT = SH * 0.68;
const TOP_CLEAR = SH - SHEET_HEIGHT;

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "transparent" },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TOP_CLEAR + 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: SHEET_HEIGHT,
    backgroundColor: C.bg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "rgba(179,157,219,0.35)",
    alignItems: "center",
    paddingTop: pad.s,
    paddingHorizontal: CARD_PADDING,
    paddingBottom: pad.xl,
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: pad.sm,
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.textPri,
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: pad.xs,
    marginTop: pad.sm,
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
  gameBox: { backgroundColor: "transparent", borderWidth: 0 },
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
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
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
