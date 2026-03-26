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

// ─────────────────────────────────────────────────────────────────────────────
// Account Option Card
// ─────────────────────────────────────────────────────────────────────────────
function AccountOptionCard({ image, label, onPress }) {
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
    <Animated.View style={[optCardS.wrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={optCardS.card}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <Image source={image} style={optCardS.iconImage} resizeMode="contain" />
        <Text style={optCardS.label}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const optCardS = StyleSheet.create({
  wrapper: { flex: 1 },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.44)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 22,
    paddingHorizontal: 10,
    gap: 10,
  },
  iconImage: { width: 52, height: 52 },
  // Option card label — bold, teal
  label: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    letterSpacing: 0.2,
    textAlign: "center",
    color: COLORS.teal,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const Account = () => {
  const router = useRouter();
  const { execute } = useApiCall();
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

  // ── Credentials form state ────────────────────────────────
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const hasEmail = userAccount?.email && userAccount.email.trim().length > 0;

  const scrollRef = useRef(null);
  const emailSectionRef = useRef(null);

  // ── Profile modal state ───────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    age: "",
    readingLevel: "Early",
  });
  const [isSaving, setIsSaving] = useState(false);
  const readingLevels = ["Early", "Middle", "Advance"];

  // ── Credentials handler ───────────────────────────────────
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

  // ── Profile handlers ──────────────────────────────────────
  const handleProfilePress = (profile) => {
    selectProfile(profile);
    router.push("/home");
  };
  const handleAddNew = () => {
    setEditingProfile(null);
    setFormData({ id: "", name: "", age: "", readingLevel: "Early" });
    setModalVisible(true);
  };
  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setFormData({
      id: profile.id,
      name: profile.name,
      age: profile.age.toString(),
      readingLevel:
        profile.level.charAt(0) + profile.level.slice(1).toLowerCase(),
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
          coins: savedProfile.coins,
          diamonds: savedProfile.diamonds,
          wordBag: { words: savedProfile?.words },
          achievements: savedProfile.achievements || [],
          favoriteBookIds: savedProfile.favoriteBookIds || [],
          createdAt: savedProfile.createdAt || null,
          updatedAt: savedProfile.updatedAt || null,
        };
        if (editingProfile) await updateProfile(profileForContext);
        else await addProfile(profileForContext);
        setModalVisible(false);
        setFormData({ id: "", name: "", age: "", readingLevel: "Early" });
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
    setFormData({ id: "", name: "", age: "", readingLevel: "Early" });
    setEditingProfile(null);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await execute(() => logoutUser(), {
            successDisplay: "none",
            errorDisplay: "toast",
            onSuccess: async () => {
              await clearAuthTokens();
              router.replace("../login");
            },
          });
        },
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────
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
              {/* ── ACCOUNT OPTION CARDS — always visible, top of screen ── */}
              <View style={styles.optionCardsSection}>
                <View style={styles.optionCardsRow}>
                  <AccountOptionCard
                    image={require("../assets/img/card-icon.png")}
                    label="Plan and Billing"
                    onPress={() =>
                      router.push("/components/billing/PlanBillingScreen")
                    }
                  />
                  <AccountOptionCard
                    image={require("../assets/img/learning-path-icon-3.png")}
                    label="Learning Path Levels"
                    onPress={() => router.push("/components/LearningPath")}
                  />
                  <AccountOptionCard
                    image={require("../assets/img/progress-report-icon.png")}
                    label="Progress Reports"
                    onPress={() => router.push("/components/Reports")}
                  />
                </View>
              </View>

              {/* ── DIVIDER ── */}
              <View style={styles.divider} />

              {/* ── WHO'S READING ── */}
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

              {/* ── Profiles ── */}
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

              {/* ── ACCOUNT SECTION — credentials / email linked ── */}
              <View style={styles.accountSection}>
                <View style={styles.accountSectionHeader}>
                  <Text style={styles.accountSectionIcon}>🔐</Text>
                  <Text style={styles.accountSectionTitle}>Account</Text>
                </View>

                {!hasEmail ? (
                  /* Set Credentials Form */
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
                  /* Email linked indicator */
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

              {/* ── Logout ── */}
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

          {/* ── Add / Edit Profile Modal ── */}
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
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Age</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter age"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      value={formData.age}
                      onChangeText={(text) =>
                        setFormData({ ...formData, age: text })
                      }
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Reading Level</Text>
                    <View style={styles.levelButtons}>
                      {readingLevels.map((level) => (
                        <TouchableOpacity
                          key={level}
                          style={[
                            styles.levelButton,
                            formData.readingLevel === level &&
                              styles.levelButtonActive,
                          ]}
                          onPress={() =>
                            setFormData({ ...formData, readingLevel: level })
                          }
                        >
                          <Text
                            style={[
                              styles.levelButtonText,
                              formData.readingLevel === level &&
                                styles.levelButtonTextActive,
                            ]}
                          >
                            {level}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
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

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: 0 },

  // ── Account option cards — top section, no box ───────────
  optionCardsSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  optionCardsRow: {
    flexDirection: "row",
    gap: 10,
  },

  // ── Divider — same color as profile card borders ─────────
  divider: {
    height: 1,
    marginHorizontal: 20,
    backgroundColor: "rgba(0,188,212,0.2)",
    marginBottom: 4,
  },

  // ── Who's Reading title — bold, large, prominent ─────────
  title: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  currentProfileBanner: {
    backgroundColor: COLORS.surfacePurple,
    borderWidth: 1.5,
    borderColor: COLORS.purple,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 10,
  },
  // Current profile indicator text — regular weight
  currentProfileText: {
    fontFamily: FONTS.regular,
    color: COLORS.purpleLight,
    fontSize: 16,
    textAlign: "center",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },

  addButton: {
    backgroundColor: "rgba(0,188,212,0.1)",
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    borderWidth: 2,
    borderColor: COLORS.teal,
    borderStyle: "dashed",
  },
  // Add profile CTA — bold, teal
  addButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.teal,
    textAlign: "center",
  },

  // ── Account section box ───────────────────────────────────
  accountSection: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.borderTeal,
    padding: 18,
  },
  accountSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  accountSectionIcon: { fontSize: 20 },
  // Section title — bold
  accountSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textPrimary,
  },

  // ── Credentials form ──────────────────────────────────────
  credentialsForm: { gap: 12 },
  // Helper hint text — light, muted
  credentialsHint: {
    fontFamily: FONTS.light,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
    marginBottom: 4,
  },
  // Input field — regular weight for typed text
  credentialsInput: {
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.surfaceDim,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.borderTeal,
  },
  credentialsSaveBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  credentialsSaveBtnDisabled: { backgroundColor: "rgba(0,188,212,0.25)" },
  // Save button text — bold CTA
  credentialsSaveBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: "#fff",
    letterSpacing: 0.3,
  },

  // ── Email linked indicator ────────────────────────────────
  emailLinkedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(0,188,212,0.07)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.25)",
  },
  emailLinkedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,188,212,0.2)",
    borderWidth: 1.5,
    borderColor: COLORS.teal,
    justifyContent: "center",
    alignItems: "center",
  },
  // Tick glyph inside badge — bold
  emailLinkedIcon: {
    fontFamily: FONTS.bold,
    color: COLORS.teal,
    fontSize: 15,
  },
  // "Linked account" sublabel — light, muted
  emailLinkedLabel: {
    fontFamily: FONTS.light,
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  // Email address value — regular
  emailLinkedValue: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.tealLight ?? COLORS.teal,
  },

  // ── Logout ────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,80,80,0.4)",
    backgroundColor: "rgba(255,80,80,0.08)",
  },
  logoutIcon: { fontSize: 18, color: "#FF6B6B" },
  // Log out label — bold, red
  logoutText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#FF6B6B",
    letterSpacing: 0.4,
  },

  // ── Profile modal ─────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.darkBg2,
    borderRadius: 25,
    padding: 25,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    borderWidth: 1.5,
    borderColor: COLORS.borderTealBold,
    ...SHADOWS.tealGlow,
  },
  // Modal title — bold, large
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 25,
  },
  inputGroup: { marginBottom: 20 },
  // Form field label — bold
  label: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  // Text input — regular weight for user-typed content
  input: {
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.surfaceDim,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.borderTeal,
  },
  levelButtons: { flexDirection: "row", gap: 10 },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceDim,
    borderWidth: 2,
    borderColor: COLORS.borderTeal,
    alignItems: "center",
  },
  levelButtonActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  // Level pill text — regular, muted when inactive
  levelButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#90CAD6",
  },
  levelButtonTextActive: { color: "#fff" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceDim,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  // Cancel button text — regular, secondary colour
  cancelButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  saveButton: { backgroundColor: COLORS.teal },
  // Save / Update button text — bold, white CTA
  saveButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#fff",
  },
});
