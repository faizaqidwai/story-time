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

const { height: SH } = Dimensions.get("window");
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

const TOAST_CONFIG = {
  success: { bg: "rgba(0,188,212,0.96)", border: "#00BCD4", icon: "✓" },
  error: { bg: "rgba(239,83,80,0.96)", border: "#EF5350", icon: "✕" },
  info: { bg: "rgba(150,82,217,0.96)", border: "#9652D9", icon: "ℹ" },
  warning: { bg: "rgba(255,213,79,0.96)", border: "#FFD54F", icon: "⚠" },
};

// Error icon per error type — used for the icon bubble only
const ERROR_ICON_MAP = {
  AUTH: { icon: "🔐", color: C.coral },
  SERVER: { icon: "⚙️", color: C.red },
  NETWORK: { icon: "📡", color: C.yellow },
  TIMEOUT: { icon: "⏱️", color: C.yellow },
  default: { icon: "⚠️", color: C.red },
};

// ─────────────────────────────────────────────────────────────────────────────
// TOAST BANNER
// ─────────────────────────────────────────────────────────────────────────────
function ToastBanner({ message, type }) {
  const insets = useSafeAreaInsets();
  const cfg = TOAST_CONFIG[type] ?? TOAST_CONFIG.error;
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
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    width: "100%",
    maxWidth: 480,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 14,
  },
  icon: { fontSize: 14, color: "#fff", fontWeight: "900", flexShrink: 0 },
  text: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
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
      <View style={[base, { borderColor: "rgba(76,175,80,0.12)" }]} />
      <Animated.View
        style={[
          base,
          {
            borderColor: "transparent",
            borderTopColor: C.green,
            borderLeftColor: C.green,
            opacity: arcs[0],
            transform: [
              { rotate: "-45deg" },
              {
                scale: arcs[0].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          base,
          {
            borderColor: "transparent",
            borderTopColor: C.green,
            borderRightColor: C.green,
            opacity: arcs[1],
            transform: [
              { rotate: "-45deg" },
              {
                scale: arcs[1].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          base,
          {
            borderColor: "transparent",
            borderBottomColor: C.green,
            borderRightColor: C.green,
            opacity: arcs[2],
            transform: [
              { rotate: "-45deg" },
              {
                scale: arcs[2].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          base,
          {
            borderColor: "transparent",
            borderBottomColor: C.green,
            borderLeftColor: C.green,
            opacity: arcs[3],
            transform: [
              { rotate: "-45deg" },
              {
                scale: arcs[3].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1],
                }),
              },
            ],
          },
        ]}
      />
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
        fontSize: 44,
        color: C.green,
        fontWeight: "900",
        opacity: op,
        textShadowColor: "rgba(76,175,80,0.6)",
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

// ─────────────────────────────────────────────────────────────────────────────
// SHEET — success and error variants
// Fix: removed contentOp fade (was causing blink)
// Fix: error sheet shows message as bold title, subMessage as body below
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
        // Trigger success animations after sheet is up
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
    if (config?.onDismiss) {
      setTimeout(() => config.onDismiss(), 320);
    }
  }, [onDismiss, config]);

  if (!visible || !config) return null;

  const isSuccess = type === "success";
  const borderColor = isSuccess ? C.greenBorder : C.redBorder;
  const shadowColor = isSuccess ? C.green : C.red;
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
            { borderColor, shadowColor, transform: [{ translateY: slideY }] },
          ]}
        >
          <View style={[ss.handle, { backgroundColor: borderColor }]} />

          <View style={ss.content}>
            {isSuccess ? (
              // ── Success visuals ──────────────────────────────────────
              <View style={ss.ringCluster}>
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
              // ── Error icon bubble ────────────────────────────────────
              <View
                style={[
                  ss.errorIconWrap,
                  { borderColor: errIconCfg.color + "80" },
                ]}
              >
                <Text style={ss.errorIcon}>
                  {config.icon ?? errIconCfg.icon}
                </Text>
              </View>
            )}

            {/*
              ERROR SHEET TEXT LAYOUT:
              - config.message  → bold title (your custom message OR backend message)
              - config.subMessage → smaller grey body text below (optional)

              SUCCESS SHEET TEXT LAYOUT:
              - config.message    → bold title
              - config.subMessage → smaller grey text below
            */}
            <Text style={isSuccess ? ss.titleSuccess : ss.titleError}>
              {config.message}
            </Text>

            {config.subMessage ? (
              <Text style={ss.subMessage}>{config.subMessage}</Text>
            ) : null}

            {/* Buttons */}
            <View style={ss.btnRow}>
              {!isSuccess && config.onRetry && (
                <TouchableOpacity
                  style={[ss.retryBtn, { borderColor: errIconCfg.color }]}
                  onPress={handleRetry}
                  disabled={retrying}
                  activeOpacity={0.85}
                >
                  {retrying ? (
                    <ActivityIndicator color={errIconCfg.color} size="small" />
                  ) : (
                    <Text style={[ss.retryText, { color: errIconCfg.color }]}>
                      Try Again
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  ss.dismissBtn,
                  { flex: 1 },
                  isSuccess && {
                    backgroundColor: C.green,
                    borderColor: C.green,
                    shadowColor: C.green,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.55,
                    shadowRadius: 14,
                    elevation: 8,
                  },
                ]}
                onPress={handleDismiss}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    ss.dismissText,
                    isSuccess && { color: "#08081a", fontWeight: "900" },
                  ]}
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
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    backgroundColor: C.bg,
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
  },
  handle: { width: 44, height: 5, borderRadius: 3, marginBottom: 24 },
  // No opacity wrapper — content visible immediately, no blink
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
  glowCircle: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(76,175,80,0.18)",
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
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(239,83,80,0.1)",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  errorIcon: { fontSize: 34 },

  // Title — bold, prominent for both success and error
  titleSuccess: {
    fontSize: 20,
    fontWeight: "900",
    color: C.textPri,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 27,
  },
  titleError: {
    fontSize: 18,
    fontWeight: "900",
    color: C.textPri,
    textAlign: "center",
    letterSpacing: 0.2,
    lineHeight: 25,
  },

  // Sub message — smaller grey body text
  subMessage: {
    fontSize: 13,
    color: C.textMuted,
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
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  retryText: { fontSize: 15, fontWeight: "800" },
  dismissBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 14,
    alignItems: "center",
  },
  dismissText: { fontSize: 15, fontWeight: "700", color: C.textMuted },
});

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
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
