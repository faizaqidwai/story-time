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
  Image,
} from "react-native";
import React, { useState, useRef } from "react";
import { useRouter } from "expo-router";
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

const AGE_OPTIONS = [
  { label: "-5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "10+", value: 11 },
];

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
const CORAL = "#FF7043";
const YELLOW = "#FFD54F";
const PINK = "#EC407A";

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
            fontSize: sz.optionCardLabelFontSize,
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
  const { planName, isFree } = useSubscription();

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
  const readingLevels = ["Early", "Middle", "Advance"];

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

  const handleProfilePress = (profile) => {
    selectProfile(profile);
    router.push("/home");
  };
  const handleAddNew = () => {
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
          // Tell the backend to mark the session INACTIVE.
          // logoutUser() never throws — it swallows network and auth errors,
          // so the user is never stuck on this screen without internet.
          await logoutUser();

          // Always clear local state and navigate to login, regardless of
          // whether the backend call succeeded or failed.
          // This also handles the offline logout problem: even if the session
          // wasn't marked INACTIVE on the backend right now, the cron job will
          // expire it within 5 minutes once its expiryDateTime passes.
          await logoutLocally();
        },
      },
    ]);
  };

  // Build styles from tokens
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
      fontSize: sz.bannerTextFontSize,
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
      marginBottom: 10,
    },
  });

  return (
    <ScreenWrapper>
      <AppBackground>
        <SafeAreaView style={styles.safeArea} edges={[]}>
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
                      <Text style={styles.genderEmoji}>🧒</Text>
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
                      <Text style={styles.genderEmoji}>👧</Text>
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
    </ScreenWrapper>
  );
};

export default Account;
