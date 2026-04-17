// app/account.jsx

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Image,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenWrapper from "./components/ScreenWrapper";
import AppBackground from "./components/AppBackground";
import ProfileCard from "./components/ProfileCard";
import { useUser } from "./_contexts/UserContext";
import { saveProfile } from "./services/profileService";
import { setUserAccountCredentials } from "./services/userAccountService";
import { COLORS, SHADOWS, FONTS } from "./theme";
import { logoutUser } from "./services/authService";
import { clearAuthTokens } from "./services/tokenStorage";
import { useApiCall } from "./_hooks/useApiCall";
import { useSubscription } from "./_contexts/SubscriptionContext";
import PlanBadge from "./components/PlanBadge";
import { useTheme } from "./_contexts/ThemeContext";
import { logoutLocally } from "./services/apiClient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { font, pad, radius, size } from "./theme/tokens";

const { width: SW } = Dimensions.get("window");

const AGE_OPTIONS = [
  { label: "-5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "10+", value: 11 },
];

const C = {
  bg: "#08081a",
  card: "#111830",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.13)",
  tealBorder: "rgba(0,188,212,0.35)",
  yellow: "#FFD54F",
  border: "rgba(0,188,212,0.2)",
  green: "#4CAF50",
  greenDim: "rgba(76,175,80,0.22)",
  greenBorder: "rgba(76,175,80,0.55)",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#7a9aaa",
  lockedBg: "rgba(255,255,255,0.03)",
  lockedBorder: "rgba(255,255,255,0.07)",
  lockedText: "rgba(255,255,255,0.18)",
  lockedIconBg: "rgba(255,255,255,0.04)",
  lockedIconBorder: "rgba(255,255,255,0.08)",
};

const START_LEVEL = [
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
];

const TEAL = "#00BCD4";
const YELLOW = "#FFD54F";
const PINK = "#EC407A";

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE LIMIT MODAL
// mode: "upgrade" — free/basic plan, needs premium to add multiple profiles
//       "limit"   — already paid but hit the plan's profile cap
// ─────────────────────────────────────────────────────────────────────────────
const UPGRADE_PROPS = [
  { emoji: "👨‍👩‍👧‍👦", text: "Create a profile for every child" },
  { emoji: "📊", text: "Separate progress tracking per child" },
  { emoji: "🎯", text: "Individual reading levels & word bags" },
  { emoji: "✨", text: "Full access to all stories & activities" },
];

const LIMIT_PROPS = [
  { emoji: "👤", text: "You've used all available profile slots" },
  { emoji: "⬆️", text: "Upgrade to unlock more profiles" },
  { emoji: "📊", text: "Keep each child's progress separate" },
  { emoji: "🎯", text: "Individual reading levels per profile" },
];

function ProfileLimitModal({ visible, mode, onClose, onUpgrade }) {
  const backdropOp = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(60)).current;
  const cardOp = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const isUpgrade = mode === "upgrade";
  const propList = isUpgrade ? UPGRADE_PROPS : LIMIT_PROPS;

  const vpAnims = useRef(
    Array.from({ length: 4 }, () => ({
      slide: new Animated.Value(30),
      op: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset all values
      backdropOp.setValue(0);
      cardY.setValue(60);
      cardOp.setValue(0);
      vpAnims.forEach((a) => {
        a.slide.setValue(30);
        a.op.setValue(0);
      });

      // Backdrop + card entrance
      Animated.parallel([
        Animated.timing(backdropOp, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(cardY, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(cardOp, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();

      // Value props stagger
      vpAnims.forEach((a, i) => {
        Animated.sequence([
          Animated.delay(300 + i * 80),
          Animated.parallel([
            Animated.timing(a.op, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.spring(a.slide, {
              toValue: 0,
              friction: 6,
              tension: 80,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });

      // Pulse loop on icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.94,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Glow loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [visible]);

  const animateOut = (cb) => {
    Animated.parallel([
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(cardOp, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardY, {
        toValue: 60,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => cb?.());
  };

  const handleClose = () => animateOut(onClose);
  const handleUpgrade = () => animateOut(onUpgrade);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.15],
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={plm.shell}>
        {/* Backdrop */}
        <Animated.View style={[plm.backdrop, { opacity: backdropOp }]} />
        <TouchableOpacity
          style={plm.backdropTap}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Card */}
        <Animated.View
          style={[
            plm.card,
            { opacity: cardOp, transform: [{ translateY: cardY }] },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={plm.closeBtn}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={plm.closeTxt}>✕</Text>
          </TouchableOpacity>

          {/* Animated icon */}
          <View style={plm.iconWrapper}>
            <Animated.View
              style={[
                plm.glowRingOuter,
                { opacity: glowOpacity, transform: [{ scale: glowScale }] },
              ]}
            />
            <Animated.View
              style={[
                plm.glowRingInner,
                { opacity: glowOpacity, transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Animated.View
              style={[plm.iconCircle, { transform: [{ scale: pulseAnim }] }]}
            >
              <Text style={plm.iconEmoji}>{isUpgrade ? "👑" : "🚫"}</Text>
            </Animated.View>
          </View>

          {/* Headline */}
          <Text style={plm.headline}>
            {isUpgrade ? "Upgrade to Add Profiles" : "Profile Limit Reached"}
          </Text>
          <Text style={plm.subline}>
            {isUpgrade
              ? "Multiple child profiles are a premium feature. Upgrade your plan to create a profile for each child."
              : "You've reached the maximum number of profiles on your current plan. Upgrade to add more."}
          </Text>

          {/* Value props */}
          <View style={plm.propsContainer}>
            {propList.map((p, i) => (
              <Animated.View
                key={i}
                style={[
                  plm.propRow,
                  {
                    opacity: vpAnims[i].op,
                    transform: [{ translateX: vpAnims[i].slide }],
                  },
                ]}
              >
                <View style={plm.propEmojiWrap}>
                  <Text style={plm.propEmoji}>{p.emoji}</Text>
                </View>
                <Text style={plm.propText}>{p.text}</Text>
              </Animated.View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={plm.ctaBtn}
            onPress={handleUpgrade}
            activeOpacity={0.88}
          >
            <View style={plm.ctaBtnInner}>
              <Text style={plm.ctaEmoji}>⚡</Text>
              <Text style={plm.ctaTxt}>Upgrade Plan</Text>
            </View>
            <View style={plm.ctaShine} />
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.6}
            style={plm.dismissWrap}
          >
            <Text style={plm.dismissTxt}>Maybe later</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const plm = StyleSheet.create({
  shell: { flex: 1, alignItems: "center", justifyContent: "center" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  backdropTap: { ...StyleSheet.absoluteFillObject },
  card: {
    width: SW - 40,
    maxWidth: 400,
    backgroundColor: C.card,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: C.border,
    borderTopColor: "rgba(0,188,212,0.4)",
    borderTopWidth: 1.5,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeTxt: { fontFamily: FONTS.bold, fontSize: 13, color: C.textMuted },
  iconWrapper: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  glowRingOuter: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,213,79,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,213,79,0.2)",
  },
  glowRingInner: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,213,79,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,213,79,0.35)",
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#1a1f3a",
    borderWidth: 2,
    borderColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 12,
  },
  iconEmoji: { fontSize: 32 },
  headline: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: C.textPri,
    letterSpacing: 0.3,
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0,188,212,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subline: {
    fontFamily: FONTS.light,
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  propsContainer: { width: "100%", marginBottom: 22, gap: 4 },
  propRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginVertical: 3,
    backgroundColor: "rgba(0,188,212,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    width: "100%",
  },
  propEmojiWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  propEmoji: { fontSize: 16 },
  propText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: C.textPri,
    flex: 1,
  },
  ctaBtn: {
    width: "100%",
    height: 54,
    borderRadius: 27,
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  ctaBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  ctaEmoji: { fontSize: 18 },
  ctaTxt: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#08081a",
    letterSpacing: 0.3,
  },
  ctaShine: {
    position: "absolute",
    top: 0,
    left: "15%",
    width: "40%",
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    transform: [{ rotate: "-15deg" }],
  },
  dismissWrap: { paddingVertical: 4 },
  dismissTxt: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: C.textMuted,
    textDecorationLine: "underline",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Account Option Card
// ─────────────────────────────────────────────────────────────────────────────
function AccountOptionCard({ image, label, onPress, sz }) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.95,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View style={[{ flex: 1, transform: [{ scale }] }]}>
      <TouchableOpacity
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: sz.optionCardBorderRadius,
          borderWidth: 1.5,
          borderColor: "rgba(0,188,212,0.44)",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: sz.optionCardPaddingV,
          paddingHorizontal: sz.optionCardPaddingH,
          gap: sz.optionCardGap,
        }}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <Image
          source={image}
          style={{
            width: sz.optionCardIconSize,
            height: sz.optionCardIconSize,
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontFamily: FONTS.bold,
            fontSize: font.md,
            letterSpacing: 0.2,
            textAlign: "center",
            color: COLORS.teal,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const Account = () => {
  const router = useRouter();
  const { execute } = useApiCall();
  const { sizes } = useTheme();
  const sz = sizes.account;
  const insets = useSafeAreaInsets();

  const {
    profiles,
    addProfile,
    updateProfile,
    deleteProfile,
    selectProfile,
    currentProfile,
    userAccount,
    setUserAccount,
  } = useUser();

  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const { planName, isFree, subscription } = useSubscription();

  const hasEmail = userAccount?.email && userAccount.email.trim().length > 0;

  const scrollRef = useRef(null);
  const emailSectionRef = useRef(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    age: "",
    gender: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Profile limit modal state
  const [profileLimitModal, setProfileLimitModal] = useState({
    visible: false,
    mode: "upgrade", // "upgrade" | "limit"
  });

  const handleSaveCredentials = async () => {
    const trimmedEmail = emailInput.trim();
    const trimmedPassword = passwordInput.trim();
    if (!trimmedEmail) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsSavingEmail(true);
    await execute(
      () => setUserAccountCredentials(trimmedEmail, trimmedPassword),
      {
        successDisplay: "sheet",
        successMessage: "Email Linked Successfully! 🎉",
        successSubMessage:
          "Your account is now secured and can be recovered on any device.",
        errorDisplay: "sheet",
        errorMessage: "Failed to Save Credentials",
        errorSubMessage: "Please check your details and try again.",
        errorRetry: true,
        onSuccess: async () => {
          if (setUserAccount)
            setUserAccount((prev) => ({ ...prev, email: trimmedEmail }));
          setEmailInput("");
          setPasswordInput("");
        },
        onError: () => setIsSavingEmail(false),
      },
    );
    setIsSavingEmail(false);
  };

  const handleProfilePress = async (profile) => {
    await selectProfile(profile);
    router.back();
  };

  const handleAddNew = () => {
    const features = subscription?.subscribedPackage?.features;
    const maxProfiles = features?.maxProfiles;

    if (!maxProfiles || maxProfiles < 2) {
      setProfileLimitModal({ visible: true, mode: "upgrade" });
      return;
    }
    if (profiles.length >= maxProfiles) {
      setProfileLimitModal({ visible: true, mode: "limit" });
      return;
    }
    setEditingProfile(null);
    setFormData({ id: "", name: "", age: "", gender: "" });
    setModalVisible(true);
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setFormData({
      id: profile.id,
      name: profile.name,
      age: profile.age.toString(),
      gender: profile.gender || "",
      playLevel: profile.playLevel.toString(),
    });
    setModalVisible(true);
  };

  const handleDelete = (profile) => {
    if (userAccount?.defaultProfileId === profile.id) {
      Alert.alert(
        "Not Allowed",
        "You cannot delete the primary profile of this account.",
      );
      return;
    }
    Alert.alert(
      "Delete Profile",
      `Are you sure you want to delete ${profile.name}'s profile?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await execute(() => deleteProfile(profile.id), {
              successDisplay: "toast",
              successMessage: "Profile deleted successfully.",
              errorDisplay: "toast",
              errorMessage: "Unable to delete profile. Please try again.",
              errorRetry: false,
            });
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }
    if (!formData.age || parseInt(formData.age) < 1) {
      Alert.alert("Error", "Please enter a valid age");
      return;
    }
    if (!formData.playLevel || parseInt(formData.playLevel) < 1) {
      Alert.alert("Error", "Please enter a valid level");
      return;
    }
    setIsSaving(true);
    await execute(() => saveProfile(formData), {
      successDisplay: "sheet",
      successMessage: editingProfile ? "Profile Updated!" : "Profile Created!",
      successSubMessage: editingProfile
        ? "Your changes have been saved."
        : "You're all set to start reading!",
      errorDisplay: "sheet",
      errorMessage: editingProfile
        ? "Unable to Update Profile"
        : "Unable to Create Profile",
      onSuccess: async (savedProfile) => {
        const profileForContext = {
          id: savedProfile.id,
          name: savedProfile.name,
          age: savedProfile.age,
          dob: savedProfile.dob || null,
          level: savedProfile.level,
          playLevel: savedProfile.playLevel,
          gender: savedProfile.gender,
          coins: savedProfile.coins,
          diamonds: savedProfile.diamonds,
          wordBag: savedProfile.wordBag,
          createdAt: savedProfile.createdAt || null,
          updatedAt: savedProfile.updatedAt || null,
        };
        if (editingProfile) await updateProfile(profileForContext);
        else await addProfile(profileForContext);
        setModalVisible(false);
        setFormData({ id: "", name: "", age: "", gender: "", level: "" });
        setEditingProfile(null);
      },
      onError: () => {
        setIsSaving(false);
        setModalVisible(false);
      },
    });
    setIsSaving(false);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setFormData({ id: "", name: "", age: "", gender: "" });
    setEditingProfile(null);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logoutUser();
          await logoutLocally();
        },
      },
    ]);
  };

  const headerPaddingTop = Math.max(insets.top, 8);

  const styles = StyleSheet.create({
    safeArea: { flex: 1, paddingTop: 0 },
    optionCardsSection: {
      paddingHorizontal: sz.optionSectionPaddingH,
      paddingTop: sz.optionSectionPaddingTop,
      paddingBottom: sz.optionSectionPaddingBottom,
    },
    optionCardsRow: { flexDirection: "row", gap: sz.optionCardRowGap },
    divider: {
      height: 1,
      marginHorizontal: sz.optionSectionPaddingH,
      backgroundColor: "rgba(0,188,212,0.2)",
      marginBottom: 4,
    },
    title: {
      fontFamily: FONTS.bold,
      fontSize: sz.titleFontSize,
      color: COLORS.textPrimary,
      textAlign: "center",
      marginTop: sz.titleMarginTop,
      marginBottom: sz.titleMarginBottom,
      textShadowColor: "rgba(0,188,212,0.4)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    currentProfileBanner: {
      backgroundColor: COLORS.surfacePurple,
      borderWidth: 1.5,
      borderColor: COLORS.purple,
      padding: sz.bannerPadding,
      marginHorizontal: sz.bannerMarginH,
      marginTop: sz.bannerMarginTop,
      marginBottom: sz.bannerMarginBottom,
      borderRadius: sz.bannerBorderRadius,
    },
    currentProfileText: {
      fontFamily: FONTS.regular,
      color: COLORS.purpleLight,
      fontSize: font.lg,
      textAlign: "center",
    },
    listContent: {
      paddingHorizontal: sz.listPaddingH,
      paddingTop: 12,
      paddingBottom: 20,
    },
    addButton: {
      backgroundColor: "rgba(0,188,212,0.1)",
      borderRadius: sz.addBtnBorderRadius,
      padding: sz.addBtnPadding,
      marginTop: sz.addBtnMarginTop,
      borderWidth: 2,
      borderColor: COLORS.teal,
      borderStyle: "dashed",
    },
    addButtonText: {
      fontFamily: FONTS.bold,
      fontSize: sz.addBtnFontSize,
      color: COLORS.teal,
      textAlign: "center",
    },
    accountSection: {
      marginHorizontal: sz.accountSectionMarginH,
      marginTop: sz.accountSectionMarginTop,
      marginBottom: sz.accountSectionMarginBottom,
      backgroundColor: "rgba(255,255,255,0.05)",
      borderRadius: sz.accountSectionBorderRadius,
      borderWidth: 1.5,
      borderColor: COLORS.borderTeal,
      padding: sz.accountSectionPadding,
    },
    accountSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: sz.accountSectionHeaderGap,
      marginBottom: sz.accountSectionHeaderMarginBottom,
    },
    accountSectionIcon: { fontSize: sz.accountSectionIconFontSize },
    accountSectionTitle: {
      fontFamily: FONTS.bold,
      fontSize: sz.accountSectionTitleFontSize,
      color: COLORS.textPrimary,
    },
    credentialsForm: { gap: 12 },
    credentialsHint: {
      fontFamily: FONTS.light,
      fontSize: sz.credentialsHintFontSize,
      color: COLORS.textMuted,
      lineHeight: sz.credentialsHintLineHeight,
      marginBottom: 4,
    },
    credentialsInput: {
      fontFamily: FONTS.regular,
      backgroundColor: COLORS.surfaceDim,
      borderRadius: sz.credentialsInputBorderRadius,
      padding: sz.credentialsInputPadding,
      fontSize: sz.credentialsInputFontSize,
      color: COLORS.textPrimary,
      borderWidth: 1.5,
      borderColor: COLORS.borderTeal,
    },
    credentialsSaveBtn: {
      backgroundColor: COLORS.teal,
      borderRadius: sz.credentialsBtnBorderRadius,
      paddingVertical: sz.credentialsBtnPaddingV,
      alignItems: "center",
      marginTop: 4,
    },
    credentialsSaveBtnDisabled: { backgroundColor: "rgba(0,188,212,0.25)" },
    credentialsSaveBtnText: {
      fontFamily: FONTS.bold,
      fontSize: sz.credentialsBtnFontSize,
      color: "#fff",
      letterSpacing: 0.3,
    },
    emailLinkedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: sz.emailLinkedRowGap,
      backgroundColor: "rgba(0,188,212,0.07)",
      borderRadius: sz.emailLinkedRowBorderRadius,
      padding: sz.emailLinkedRowPadding,
      borderWidth: 1,
      borderColor: "rgba(0,188,212,0.25)",
    },
    emailLinkedBadge: {
      width: sz.emailLinkedBadgeSize,
      height: sz.emailLinkedBadgeSize,
      borderRadius: sz.emailLinkedBadgeBorderRadius,
      backgroundColor: "rgba(0,188,212,0.2)",
      borderWidth: 1.5,
      borderColor: COLORS.teal,
      justifyContent: "center",
      alignItems: "center",
    },
    emailLinkedIcon: {
      fontFamily: FONTS.bold,
      color: COLORS.teal,
      fontSize: sz.emailLinkedIconFontSize,
    },
    emailLinkedLabel: {
      fontFamily: FONTS.light,
      fontSize: sz.emailLinkedLabelFontSize,
      color: COLORS.textMuted,
      marginBottom: 2,
    },
    emailLinkedValue: {
      fontFamily: FONTS.regular,
      fontSize: sz.emailLinkedValueFontSize,
      color: COLORS.tealLight ?? COLORS.teal,
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: sz.logoutGap,
      marginHorizontal: sz.logoutMarginH,
      marginTop: sz.logoutMarginTop,
      paddingVertical: sz.logoutPaddingV,
      borderRadius: sz.logoutBorderRadius,
      borderWidth: 1.5,
      borderColor: "rgba(255,80,80,0.4)",
      backgroundColor: "rgba(255,80,80,0.08)",
    },
    logoutIcon: { fontSize: sz.logoutIconFontSize, color: "#FF6B6B" },
    logoutText: {
      fontFamily: FONTS.bold,
      fontSize: sz.logoutTextFontSize,
      color: "#FF6B6B",
      letterSpacing: 0.4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "center",
      alignItems: "center",
      padding: sz.modalOverlayPadding,
    },
    modalContent: {
      backgroundColor: COLORS.darkBg2,
      borderRadius: sz.modalBorderRadius,
      padding: sz.modalPadding,
      width: "100%",
      maxWidth: sz.modalMaxWidth,
      maxHeight: "80%",
      borderWidth: 1.5,
      borderColor: COLORS.borderTealBold,
      ...SHADOWS.tealGlow,
    },
    modalTitle: {
      fontFamily: FONTS.bold,
      fontSize: sz.modalTitleFontSize,
      color: COLORS.textPrimary,
      textAlign: "center",
      marginBottom: sz.modalTitleMarginBottom,
    },
    inputGroup: { marginBottom: sz.modalInputGroupMarginBottom },
    label: {
      fontFamily: FONTS.bold,
      fontSize: sz.modalLabelFontSize,
      color: COLORS.textSecondary,
      marginBottom: sz.modalLabelMarginBottom,
    },
    input: {
      fontFamily: FONTS.regular,
      backgroundColor: COLORS.surfaceDim,
      borderRadius: sz.modalInputBorderRadius,
      padding: sz.modalInputPadding,
      fontSize: sz.modalInputFontSize,
      color: COLORS.textPrimary,
      borderWidth: 1.5,
      borderColor: COLORS.borderTeal,
    },
    ageSection: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: sz.ageSectionGap,
      marginTop: sz.ageSectionMarginTop,
    },
    ageBtn: {
      width: sz.ageBtnSize,
      height: sz.ageBtnSize,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: sz.ageBtnBorderRadius,
      backgroundColor: "rgba(0,188,212,0.1)",
      borderWidth: 2,
      borderColor: "rgba(0,188,212,0.45)",
      shadowColor: TEAL,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      gap: 4,
    },
    ageBtnActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
    ageBtnText: {
      fontFamily: FONTS.bold,
      fontSize: sz.ageBtnFontSize,
      color: "#E0F7FA",
    },
    genderSection: {
      flexDirection: "row",
      gap: sz.genderSectionGap,
      marginTop: sz.genderSectionMarginTop,
    },
    genderBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: sz.genderBtnBorderRadius,
      paddingVertical: sz.genderBtnPaddingV,
      elevation: 6,
      borderWidth: 2.5,
    },
    genderBtnBoy: {
      backgroundColor: "rgba(66,165,245,0.15)",
      borderColor: "#42A5F5",
      shadowColor: "#42A5F5",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
    },
    genderBtnGirl: {
      backgroundColor: "rgba(236,64,122,0.15)",
      borderColor: PINK,
      shadowColor: PINK,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
    },
    genderEmoji: { fontSize: sz.genderEmojiFontSize, marginBottom: 10 },
    genderBtnActive: { opacity: 1, borderWidth: 5.5 },
    genderLabel: {
      fontFamily: FONTS.bold,
      fontSize: sz.genderLabelFontSize,
      color: "#E0F7FA",
      letterSpacing: 1,
    },
    modalActions: {
      flexDirection: "row",
      gap: sz.modalActionGap,
      marginTop: sz.modalActionMarginTop,
    },
    actionButton: {
      flex: 1,
      paddingVertical: sz.actionBtnPaddingV,
      borderRadius: sz.actionBtnBorderRadius,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: COLORS.surfaceDim,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },
    cancelButtonText: {
      fontFamily: FONTS.regular,
      fontSize: sz.actionBtnFontSize,
      color: COLORS.textSecondary,
    },
    saveButton: { backgroundColor: COLORS.teal },
    saveButtonText: {
      fontFamily: FONTS.bold,
      fontSize: sz.actionBtnFontSize,
      color: "#fff",
    },
    planBadgeRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      width: "90%",
    },
    customHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: pad.sm,
      paddingBottom: pad.sm,
      backgroundColor: C.bg,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,188,212,0.12)",
    },
    backButton: {
      width: size.hitSm,
      height: size.hitSm,
      borderRadius: size.hitSm / 2,
      backgroundColor: "rgba(0,188,212,0.08)",
      borderWidth: 1,
      borderColor: C.tealBorder,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    headerSpacer: { flex: 1 },
  });

  return (
    <ScreenWrapper>
      <AppBackground>
        <SafeAreaView style={styles.safeArea} edges={[]}>
          <View style={[styles.customHeader, { paddingTop: headerPaddingTop }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={20} color={C.teal} />
            </TouchableOpacity>
            <View style={styles.headerSpacer} />
            <View style={styles.planBadgeRow}>
              <PlanBadge planName={planName} isFree={isFree} />
            </View>
            <View style={styles.headerSpacer} />
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 60}
          >
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.optionCardsSection}>
                <View style={styles.optionCardsRow}>
                  <AccountOptionCard
                    image={require("../assets/img/card-icon.png")}
                    label="Plan and Billing"
                    onPress={() =>
                      router.push("/components/billing/PlanBillingScreen")
                    }
                    sz={sz}
                  />
                  <AccountOptionCard
                    image={require("../assets/img/learning-path-icon-3.png")}
                    label="Learning Path Levels"
                    onPress={() => router.push("/components/LearningPath")}
                    sz={sz}
                  />
                  <AccountOptionCard
                    image={require("../assets/img/progress-report-icon.png")}
                    label="Progress Reports"
                    onPress={() => router.push("/components/Reports")}
                    sz={sz}
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.title}>Who's Reading?</Text>

              {currentProfile && (
                <View style={styles.currentProfileBanner}>
                  <Text style={styles.currentProfileText}>
                    Currently: {currentProfile.name} (
                    {currentProfile.level.charAt(0) +
                      currentProfile.level.slice(1).toLowerCase()}
                    )
                  </Text>
                </View>
              )}

              <View style={styles.listContent}>
                {profiles.map((item) => (
                  <ProfileCard
                    key={item.id}
                    name={item.name}
                    age={item.age}
                    readingLevel={
                      item.level.charAt(0) + item.level.slice(1).toLowerCase()
                    }
                    avatar={item.avatar || null}
                    isCurrentProfile={currentProfile?.id === item.id}
                    onPress={() => handleProfilePress(item)}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddNew}
                >
                  <Text style={styles.addButtonText}>+ Add New Profile</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.accountSection}>
                <View style={styles.accountSectionHeader}>
                  <Text style={styles.accountSectionIcon}>🔐</Text>
                  <Text style={styles.accountSectionTitle}>Account</Text>
                </View>

                {!hasEmail ? (
                  <View style={styles.credentialsForm}>
                    <Text style={styles.credentialsHint}>
                      Link an email and password to secure your account and
                      recover it on any device.
                    </Text>
                    <TextInput
                      style={styles.credentialsInput}
                      placeholder="Email address"
                      placeholderTextColor={COLORS.textMuted}
                      value={emailInput}
                      onChangeText={setEmailInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => {
                        setTimeout(() => {
                          emailSectionRef.current?.measureLayout(
                            scrollRef.current?.getScrollableNode?.() ??
                              scrollRef.current,
                            (_x, y) =>
                              scrollRef.current?.scrollTo({
                                y: y - 16,
                                animated: true,
                              }),
                            () =>
                              scrollRef.current?.scrollToEnd({
                                animated: true,
                              }),
                          );
                        }, 150);
                      }}
                    />
                    <TextInput
                      style={styles.credentialsInput}
                      placeholder="Password (min. 6 characters)"
                      placeholderTextColor={COLORS.textMuted}
                      value={passwordInput}
                      onChangeText={setPasswordInput}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={[
                        styles.credentialsSaveBtn,
                        (!emailInput.trim() ||
                          !passwordInput.trim() ||
                          isSavingEmail) &&
                          styles.credentialsSaveBtnDisabled,
                      ]}
                      onPress={handleSaveCredentials}
                      disabled={
                        !emailInput.trim() ||
                        !passwordInput.trim() ||
                        isSavingEmail
                      }
                    >
                      {isSavingEmail ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.credentialsSaveBtnText}>
                          Link Account ➜
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emailLinkedRow}>
                    <View style={styles.emailLinkedBadge}>
                      <Text style={styles.emailLinkedIcon}>✓</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emailLinkedLabel}>
                        Linked account
                      </Text>
                      <Text style={styles.emailLinkedValue}>
                        {userAccount.email}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutIcon}>⏻</Text>
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>

              <View style={{ height: 32 }} />
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Profile create / edit modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={handleCancel}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {editingProfile ? "Edit Profile" : "Create New Profile"}
                </Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter name"
                      placeholderTextColor={COLORS.textMuted}
                      value={formData.name}
                      onChangeText={(text) =>
                        setFormData({ ...formData, name: text })
                      }
                    />
                  </View>
                  {!editingProfile && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Age</Text>
                        <View style={styles.ageSection}>
                          {AGE_OPTIONS.map((opt) => {
                            const isSelected =
                              parseInt(formData.age) === opt.value;
                            return (
                              <TouchableOpacity
                                key={opt.value}
                                style={[
                                  styles.ageBtn,
                                  isSelected && styles.ageBtnActive,
                                ]}
                                onPress={() =>
                                  setFormData({
                                    ...formData,
                                    age: opt.value.toString(),
                                  })
                                }
                              >
                                <Text style={styles.ageBtnText}>
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Level</Text>
                        <View style={styles.ageSection}>
                          {START_LEVEL.map((opt) => {
                            const isSelected =
                              parseInt(formData.playLevel) === opt.value;
                            return (
                              <TouchableOpacity
                                key={opt.value}
                                style={[
                                  styles.ageBtn,
                                  isSelected && styles.ageBtnActive,
                                ]}
                                onPress={() =>
                                  setFormData({
                                    ...formData,
                                    playLevel: opt.value.toString(),
                                  })
                                }
                              >
                                <Text style={styles.ageBtnText}>
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  )}
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.genderSection}>
                    <TouchableOpacity
                      style={[
                        styles.genderBtn,
                        styles.genderBtnBoy,
                        formData.gender === "MALE" && styles.genderBtnActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, gender: "MALE" })
                      }
                      activeOpacity={0.85}
                    >
                      <ExpoImage
                        source={require("../assets/img/boy-icon.png")}
                        style={{
                          width: 50,
                          height: 50,
                          marginBottom: 5,
                        }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                      <Text style={styles.genderLabel}>Boy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.genderBtn,
                        styles.genderBtnGirl,
                        formData.gender === "FEMALE" && styles.genderBtnActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, gender: "FEMALE" })
                      }
                      activeOpacity={0.85}
                    >
                      <ExpoImage
                        source={require("../assets/img/girl-icon.png")}
                        style={{
                          width: 50,
                          height: 50,
                          marginBottom: 5,
                        }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                      <Text style={styles.genderLabel}>Girl</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={handleCancel}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {editingProfile ? "Update" : "Save"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </AppBackground>

      {/* Profile limit / upgrade modal — outside SafeAreaView so it covers everything */}
      <ProfileLimitModal
        visible={profileLimitModal.visible}
        mode={profileLimitModal.mode}
        onClose={() =>
          setProfileLimitModal((prev) => ({ ...prev, visible: false }))
        }
        onUpgrade={() => {
          setProfileLimitModal((prev) => ({ ...prev, visible: false }));
          router.push("/components/billing/PlanBillingScreen");
        }}
      />
    </ScreenWrapper>
  );
};

export default Account;
