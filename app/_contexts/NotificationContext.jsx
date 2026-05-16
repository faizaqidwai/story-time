// app/_contexts/NotificationContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONTS } from "../theme";

const { height: SH, width: SW } = Dimensions.get("window");
const NotificationContext = createContext(null);
const SHEET_H = SH * 0.44;

const C = {
  bg: "#111830",
  green: "#4CAF50",
  greenBorder: "rgba(76,175,80,0.5)",
  greenGlow: "rgba(76,175,80,0.22)",
  red: "#EF5350",
  redBorder: "rgba(239,83,80,0.5)",
  teal: "#00BCD4",
  yellow: "#FFD54F",
  purple: "#9652D9",
  coral: "#FF7043",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
};

// ── Success sheet colours ─────────────────────────────────────────────────
const SUCCESS_SHEET = {
  bg: "#2E7D32",
  circleDark: "#1B5E20",
  circleLight: "rgba(255,255,255,0.10)",
  border: "rgba(27,94,32,0.8)",
  handle: "#1B5E20",
  tick: "#FFFFFF",
  ringColor: "rgba(255,255,255,0.55)",
  ringFaint: "rgba(255,255,255,0.12)",
  titleColor: "#1B5E20",
  subColor: "rgba(27,94,32,0.75)",
  btnBg: "rgba(27,94,32,0.3)",
  btnBorder: "rgba(27,94,32,0.7)",
  btnText: "#FFFFFF",
  glow: "rgba(27,94,32,0.25)",
};

const TOAST_CONFIG = {
  error: { bg: "rgba(239,83,80,0.96)", border: "#EF5350", icon: "✕" },
  info: { bg: "rgba(150,82,217,0.96)", border: "#9652D9", icon: "ℹ" },
  warning: { bg: "rgba(255,213,79,0.96)", border: "#FFD54F", icon: "⚠" },
};

const SUCCESS_TOAST = {
  bg: "rgba(10, 28, 14, 0.98)",
  border: "rgba(76,175,80,0.4)",
  badgeBg: "rgba(76,175,80,0.12)",
  badgeBorder: "rgba(76,175,80,0.35)",
  tickColor: "#66BB6A",
  textColor: "#A5D6A7",
};

const ERROR_TOAST = {
  bg: "rgba(40, 10, 10, 0.98)",
  border: "rgba(239,83,80,0.4)",
  badgeBg: "rgba(239,83,80,0.12)",
  badgeBorder: "rgba(239,83,80,0.35)",
  crossColor: "#EF9A9A",
  textColor: "#FFCDD2",
};

const ERROR_ICON_MAP = {
  AUTH: { icon: "🔐", color: C.coral },
  SERVER: { icon: "⚙️", color: C.red },
  NETWORK: { icon: "📡", color: C.yellow },
  TIMEOUT: { icon: "⏱️", color: C.yellow },
  default: { icon: "⚠️", color: C.red },
};

// ─────────────────────────────────────────────────────────────────────────────
// TOAST BANNER — unchanged
// ─────────────────────────────────────────────────────────────────────────────
function ToastBanner({ message, type }) {
  const insets = useSafeAreaInsets();

  if (type === "success") {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          ts.toast,
          {
            backgroundColor: SUCCESS_TOAST.bg,
            borderColor: SUCCESS_TOAST.border,
            top: insets.top + 8,
          },
        ]}
      >
        <View
          style={[
            ts.successBadge,
            {
              backgroundColor: SUCCESS_TOAST.badgeBg,
              borderColor: SUCCESS_TOAST.badgeBorder,
            },
          ]}
        >
          <Text style={[ts.successTick, { color: SUCCESS_TOAST.tickColor }]}>
            ✓
          </Text>
        </View>
        <Text
          style={[ts.text, { color: SUCCESS_TOAST.textColor }]}
          numberOfLines={3}
        >
          {message}
        </Text>
      </Animated.View>
    );
  }

  if (type === "error") {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          ts.toast,
          {
            backgroundColor: ERROR_TOAST.bg,
            borderColor: ERROR_TOAST.border,
            top: insets.top + 8,
          },
        ]}
      >
        <View
          style={[
            ts.successBadge,
            {
              backgroundColor: ERROR_TOAST.badgeBg,
              borderColor: ERROR_TOAST.badgeBorder,
            },
          ]}
        >
          <Text style={[ts.successTick, { color: ERROR_TOAST.crossColor }]}>
            ✕
          </Text>
        </View>
        <Text
          style={[ts.text, { color: ERROR_TOAST.textColor }]}
          numberOfLines={3}
        >
          {message}
        </Text>
      </Animated.View>
    );
  }

  const cfg = TOAST_CONFIG[type] ?? TOAST_CONFIG.info;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        ts.toast,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          top: insets.top + 8,
        },
      ]}
    >
      <Text style={ts.icon}>{cfg.icon}</Text>
      <Text style={ts.text} numberOfLines={3}>
        {message}
      </Text>
    </Animated.View>
  );
}

const ts = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    width: "100%",
    maxWidth: 480,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 14,
  },
  successBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  successTick: {
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  icon: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: "#fff",
    flexShrink: 0,
  },
  text: {
    fontFamily: FONTS.regular,
    flex: 1,
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS SHEET ANIMATIONS
// ─────────────────────────────────────────────────────────────────────────────
const BURST_ICONS = [
  { emoji: "⭐", angle: 0 },
  { emoji: "✨", angle: 45 },
  { emoji: "🌟", angle: 90 },
  { emoji: "💫", angle: 135 },
  { emoji: "⭐", angle: 180 },
  { emoji: "✨", angle: 225 },
  { emoji: "🌟", angle: 270 },
  { emoji: "💫", angle: 315 },
];
const BURST_RADIUS = 88;

function BurstIcon({ emoji, angle, trigger }) {
  const dist = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;
    dist.setValue(0);
    op.setValue(0);
    sc.setValue(0);
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(dist, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sc, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1100),
      Animated.parallel([
        Animated.timing(op, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(sc, {
          toValue: 0.4,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [trigger]);

  const rad = (angle * Math.PI) / 180;
  const tx = dist.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(rad) * BURST_RADIUS],
  });
  const ty = dist.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(rad) * BURST_RADIUS],
  });

  return (
    <Animated.Text
      style={{
        position: "absolute",
        fontSize: 18,
        opacity: op,
        transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
      }}
      pointerEvents="none"
    >
      {emoji}
    </Animated.Text>
  );
}

// ── Animated ring — now uses white strokes on green background ────────────
function AnimatedRing({ trigger, size = 118 }) {
  const thick = size * 0.07;
  const arcs = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!trigger) return;
    arcs.forEach((a) => a.setValue(0));
    Animated.parallel(
      arcs.map((a, i) =>
        Animated.sequence([
          Animated.delay(i * 85),
          Animated.spring(a, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
      ),
    ).start();
  }, [trigger]);

  const base = {
    position: "absolute",
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: thick,
    transform: [{ rotate: "-45deg" }],
  };

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={[base, { borderColor: SUCCESS_SHEET.ringFaint }]} />
      {[
        {
          borderTopColor: SUCCESS_SHEET.ringColor,
          borderLeftColor: SUCCESS_SHEET.ringColor,
        },
        {
          borderTopColor: SUCCESS_SHEET.ringColor,
          borderRightColor: SUCCESS_SHEET.ringColor,
        },
        {
          borderBottomColor: SUCCESS_SHEET.ringColor,
          borderRightColor: SUCCESS_SHEET.ringColor,
        },
        {
          borderBottomColor: SUCCESS_SHEET.ringColor,
          borderLeftColor: SUCCESS_SHEET.ringColor,
        },
      ].map((colors, i) => (
        <Animated.View
          key={i}
          style={[
            base,
            {
              borderColor: "transparent",
              ...colors,
              opacity: arcs[i],
              transform: [
                { rotate: "-45deg" },
                {
                  scale: arcs[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function AnimatedTick({ trigger }) {
  const sc = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!trigger) return;
    sc.setValue(0);
    op.setValue(0);
    rot.setValue(0.8);
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(sc, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(rot, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [trigger]);

  return (
    <Animated.Text
      style={{
        fontFamily: FONTS.bold,
        fontSize: 44,
        color: SUCCESS_SHEET.tick,
        opacity: op,
        textShadowColor: "rgba(255,255,255,0.3)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
        transform: [
          {
            scale: sc.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          },
          {
            rotate: rot.interpolate({
              inputRange: [0, 1],
              outputRange: ["-30deg", "0deg"],
            }),
          },
        ],
      }}
    >
      ✓
    </Animated.Text>
  );
}

function AnimatedErrorRing({ trigger, size = 118 }) {
  const thick = size * 0.07;
  const arcs = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!trigger) return;
    arcs.forEach((a) => a.setValue(0));
    Animated.parallel(
      arcs.map((a, i) =>
        Animated.sequence([
          Animated.delay(i * 85),
          Animated.spring(a, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
      ),
    ).start();
  }, [trigger]);

  const base = {
    position: "absolute",
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: thick,
    transform: [{ rotate: "-45deg" }],
  };

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={[base, { borderColor: "rgba(239,83,80,0.08)" }]} />
      {[
        { borderTopColor: "#EF9A9A", borderLeftColor: "#EF9A9A" },
        { borderTopColor: "#EF9A9A", borderRightColor: "#EF9A9A" },
        { borderBottomColor: "#EF9A9A", borderRightColor: "#EF9A9A" },
        { borderBottomColor: "#EF9A9A", borderLeftColor: "#EF9A9A" },
      ].map((colors, i) => (
        <Animated.View
          key={i}
          style={[
            base,
            {
              borderColor: "transparent",
              ...colors,
              opacity: arcs[i],
              transform: [
                { rotate: "-45deg" },
                {
                  scale: arcs[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function AnimatedCross({ trigger }) {
  const sc = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!trigger) return;
    sc.setValue(0);
    op.setValue(0);
    rot.setValue(0.8);
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(sc, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(rot, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [trigger]);

  return (
    <Animated.Text
      style={{
        fontFamily: FONTS.bold,
        fontSize: 44,
        color: "#EF9A9A",
        opacity: op,
        textShadowColor: "rgba(239,83,80,0.35)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
        transform: [
          {
            scale: sc.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          },
          {
            rotate: rot.interpolate({
              inputRange: [0, 1],
              outputRange: ["-30deg", "0deg"],
            }),
          },
        ],
      }}
    >
      ✕
    </Animated.Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET
// ─────────────────────────────────────────────────────────────────────────────
function Sheet({ visible, type, config, onDismiss }) {
  const slideY = useRef(new Animated.Value(SHEET_H)).current;
  const scrOp = useRef(new Animated.Value(0)).current;
  const [trigger, setTrigger] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const autoRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setTrigger(false);
      setRetrying(false);
      slideY.setValue(SHEET_H);
      scrOp.setValue(0);
      Animated.parallel([
        Animated.timing(scrOp, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTrigger(true);
        const ms = config?.autoDismissMs;
        if (ms && ms > 0) {
          autoRef.current = setTimeout(() => handleDismiss(), ms);
        }
      });
    } else {
      if (autoRef.current) clearTimeout(autoRef.current);
      setTrigger(false);
      Animated.parallel([
        Animated.timing(scrOp, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: SHEET_H,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
    return () => {
      if (autoRef.current) clearTimeout(autoRef.current);
    };
  }, [visible]);

  const handleDismiss = useCallback(() => {
    if (autoRef.current) clearTimeout(autoRef.current);
    onDismiss?.();
    if (config?.onDismiss) setTimeout(() => config.onDismiss(), 320);
  }, [onDismiss, config]);

  if (!visible || !config) return null;

  const isSuccess = type === "success";
  const borderColor = isSuccess ? SUCCESS_SHEET.border : C.redBorder;
  const shadowColor = isSuccess ? "#1B5E20" : C.red;
  const errIconCfg = ERROR_ICON_MAP[config.errorType] ?? ERROR_ICON_MAP.default;

  const handleRetry = async () => {
    if (!config.onRetry) return;
    setRetrying(true);
    try {
      await config.onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={ss.shell} pointerEvents="box-none">
        <Animated.View
          style={[ss.scrim, { opacity: scrOp }]}
          pointerEvents="none"
        />
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleDismiss}
          activeOpacity={1}
        />

        <Animated.View
          style={[
            ss.sheet,
            isSuccess && ss.sheetSuccess,
            !isSuccess && ss.sheetError,
            { borderColor, shadowColor, transform: [{ translateY: slideY }] },
          ]}
        >
          {/* ── Decorative circles — HomeCategoryCard style ── */}
          {isSuccess && (
            <>
              {/* Large circle top-right */}
              <View style={ss.decCircle1} pointerEvents="none" />
              {/* Medium circle bottom-left */}
              <View style={ss.decCircle2} pointerEvents="none" />
              {/* Small accent circle top-left */}
              <View style={ss.decCircle3} pointerEvents="none" />
              {/* Tiny circle bottom-right */}
              <View style={ss.decCircle4} pointerEvents="none" />
            </>
          )}

          <View
            style={[
              ss.handle,
              {
                backgroundColor: isSuccess ? SUCCESS_SHEET.handle : borderColor,
              },
            ]}
          />

          <View style={ss.content}>
            {isSuccess ? (
              <View style={ss.ringCluster}>
                {/* Glow circle — #1B5E20 */}
                <View style={ss.glowCircle} />
                <AnimatedRing trigger={trigger} size={118} />
                <View style={ss.burstWrap}>
                  {BURST_ICONS.map((b, i) => (
                    <BurstIcon
                      key={i}
                      emoji={b.emoji}
                      angle={b.angle}
                      trigger={trigger}
                    />
                  ))}
                </View>
                <View style={ss.centreWrap}>
                  {config.icon ? (
                    <Text style={{ fontSize: 44 }}>{config.icon}</Text>
                  ) : (
                    <AnimatedTick trigger={trigger} />
                  )}
                </View>
              </View>
            ) : (
              <View style={ss.ringCluster}>
                <View style={ss.errorGlowCircle} />
                <AnimatedErrorRing trigger={trigger} size={118} />
                <View style={ss.centreWrap}>
                  <AnimatedCross trigger={trigger} />
                </View>
              </View>
            )}

            <Text style={isSuccess ? ss.titleSuccess : ss.titleError}>
              {config.message}
            </Text>

            {config.subMessage ? (
              <Text style={isSuccess ? ss.subMessageSuccess : ss.subMessage}>
                {config.subMessage}
              </Text>
            ) : null}

            <View style={ss.btnRow}>
              {!isSuccess && config.onRetry && (
                <TouchableOpacity
                  style={ss.retryBtn}
                  onPress={handleRetry}
                  disabled={retrying}
                  activeOpacity={0.85}
                >
                  {retrying ? (
                    <ActivityIndicator color={errIconCfg.color} size="small" />
                  ) : (
                    <Text style={ss.retryText}>Try Again</Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  ss.dismissBtn,
                  { flex: 1 },
                  isSuccess && ss.dismissBtnSuccess,
                ]}
                onPress={handleDismiss}
                activeOpacity={0.85}
              >
                <Text
                  style={[ss.dismissText, isSuccess && ss.dismissTextSuccess]}
                >
                  {isSuccess ? "Continue" : "Dismiss"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ss = StyleSheet.create({
  shell: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  // Base sheet — dark (error / default)
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    backgroundColor: "rgba(8, 12, 18, 0.92)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 24,
    overflow: "hidden", // clips decorative circles
  },

  // Success sheet override — solid #2E7D32
  sheetSuccess: {
    backgroundColor: "#2E7D32",
  },

  // Success sheet override — solid #F57F17
  sheetError: {
    backgroundColor: "#F57F17",
  },

  // ── Decorative circles (HomeCategoryCard style) ───────────────────────
  decCircle1: {
    position: "absolute",
    width: SW * 0.75,
    height: SW * 0.75,
    borderRadius: SW * 0.375,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -(SW * 0.35),
    right: -(SW * 0.25),
  },
  decCircle2: {
    position: "absolute",
    width: SW * 0.55,
    height: SW * 0.55,
    borderRadius: SW * 0.275,
    backgroundColor: "rgba(27,94,32,0.45)",
    bottom: -(SW * 0.15),
    left: -(SW * 0.15),
  },
  decCircle3: {
    position: "absolute",
    width: SW * 0.3,
    height: SW * 0.3,
    borderRadius: SW * 0.15,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: SHEET_H * 0.3,
    left: -(SW * 0.08),
  },
  decCircle4: {
    position: "absolute",
    width: SW * 0.2,
    height: SW * 0.2,
    borderRadius: SW * 0.1,
    backgroundColor: "rgba(27,94,32,0.35)",
    bottom: SHEET_H * 0.15,
    right: -(SW * 0.05),
  },

  handle: { width: 44, height: 5, borderRadius: 3, marginBottom: 24 },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    width: "100%",
  },

  ringCluster: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  // Success glow — #1B5E20
  glowCircle: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#1B5E20",
  },

  errorGlowCircle: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#E65100",
  },

  burstWrap: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  centreWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  // Success title — #1B5E20
  titleSuccess: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: "#07370a",
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 27,
  },
  titleError: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: C.textPri,
    textAlign: "center",
    letterSpacing: 0.2,
    lineHeight: 25,
  },

  subMessage: {
    fontFamily: FONTS.light,
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginTop: -4,
    paddingHorizontal: 12,
  },
  // Success sub message — darker green
  subMessageSuccess: {
    fontFamily: FONTS.light,
    fontSize: 13,
    color: "#07370a",
    textAlign: "center",
    lineHeight: 19,
    marginTop: -4,
    paddingHorizontal: 12,
  },

  btnRow: { flexDirection: "row", gap: 12, width: "100%", marginTop: 8 },

  retryBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#00BCD4",
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#00BCD4",
  },
  retryText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: "#FFFFFF",
  },

  dismissBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E65100",
    backgroundColor: "#E65100",
    paddingVertical: 14,
    alignItems: "center",
  },
  // Success Continue button — dark green bg, white text
  dismissBtnSuccess: {
    backgroundColor: "#004D40",
    borderColor: "rgba(27,94,32,0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  dismissText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  dismissTextSuccess: {
    color: "#FFFFFF",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER — unchanged
// ─────────────────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }) {
  const [toast, setToast] = useState(null);
  const slideY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const [sheet, setSheet] = useState(null);
  const _hideSheet = useCallback(() => setSheet(null), []);

  const _showToast = useCallback(({ message, type, duration = 3000 }) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    slideY.setValue(-120);
    opacity.setValue(0);
    setToast({ message, type });
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: -120,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setToast(null));
    }, duration);
  }, []);

  const notify = {
    toast: {
      success: (message, options = {}) =>
        _showToast({ message, type: "success", ...options }),
      error: (message, options = {}) =>
        _showToast({ message, type: "error", ...options }),
      info: (message, options = {}) =>
        _showToast({ message, type: "info", ...options }),
      warning: (message, options = {}) =>
        _showToast({ message, type: "warning", ...options }),
    },
    sheet: {
      success: (config) =>
        setSheet({
          type: "success",
          config: { autoDismissMs: 2800, ...config },
        }),
      error: (config) =>
        setSheet({ type: "error", config: { autoDismissMs: 0, ...config } }),
    },
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            provS.toastWrapper,
            { transform: [{ translateY: slideY }], opacity },
          ]}
        >
          <ToastBanner message={toast.message} type={toast.type} />
        </Animated.View>
      )}
      <Sheet
        visible={!!sheet}
        type={sheet?.type}
        config={sheet?.config}
        onDismiss={_hideSheet}
      />
    </NotificationContext.Provider>
  );
}

const provS = StyleSheet.create({
  toastWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
    paddingHorizontal: 16,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error("useNotify must be used within NotificationProvider");
  return ctx;
}

export const useToast = useNotify;
