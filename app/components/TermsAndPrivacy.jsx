// app/components/TermsAndPrivacy.jsx
//
// Full Terms of Service & Privacy Policy screen for StoryTime / CodeKlusters
// Rendered as a scrollable native screen — matches the app's dark teal aesthetic.

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONTS } from "../theme";
import { font, pad, radius } from "../theme/tokens";

const { width: SW } = Dimensions.get("window");

const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.04)",
  surfaceHigh: "rgba(255,255,255,0.08)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.12)",
  tealBorder: "rgba(0,188,212,0.3)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.1)",
  purple: "#9652D9",
  purpleDim: "rgba(150,82,217,0.12)",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
  divider: "rgba(255,255,255,0.06)",
};

const LAST_UPDATED = "April 2026";
const CONTACT_EMAIL = "support@codeKlusters.com";

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    content:
      'By downloading, installing, or using the StoryTime mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App.\n\nThese Terms constitute a legally binding agreement between you and CodeKlusters ("we," "us," or "our"). We reserve the right to update these Terms at any time. Continued use of the App after changes are posted constitutes your acceptance of the revised Terms.',
  },
  {
    title: "2. Description of the App",
    content:
      "StoryTime is an educational reading application designed to help children develop vocabulary, comprehension, and literacy skills through interactive stories, word games, listening activities, and description challenges. The App is intended to be used by children under the supervision and control of a parent or guardian.",
  },
  {
    title: "3. Eligibility and Accounts",
    content:
      "Parent/Guardian Accounts: The App is intended for use by children, but accounts must be created and managed by a parent or legal guardian who is at least 18 years of age. By creating an account, you confirm that you are at least 18 years old and have the legal authority to agree to these Terms on behalf of any child who uses the App.\n\nChild Profiles: After creating a parent account, you may create child profiles within the App. You are responsible for all activity that occurs under your account and any child profiles linked to it.\n\nAccount Security: You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately at support@codeKlusters.com if you suspect any unauthorised access.\n\nAccount Accuracy: You agree to provide accurate, current, and complete information when creating your account and to keep this information up to date.",
  },
  {
    title: "4. Subscriptions and Payments",
    content:
      "Free Tier: The App offers a free tier with limited access to stories and features.\n\nPremium Subscriptions: Full access to all stories, activities, levels, and multiple child profiles requires a paid subscription. Subscription plans and pricing are displayed within the App at the time of purchase.\n\nPayment Processing: All payments are processed through Apple In-App Purchase (iOS) or Google Play Billing (Android). We do not directly collect or store your payment card information.\n\nBilling Cycle: Subscriptions are billed on a recurring basis (monthly or annually, depending on the plan selected) and will automatically renew unless cancelled.\n\nCancellation: You may cancel your subscription at any time through your Apple App Store or Google Play account settings. Cancellation takes effect at the end of the current billing period.\n\nRefunds: Refund requests must be directed to Apple or Google depending on where you made your purchase, as they control all billing and refund decisions.\n\nPrice Changes: We reserve the right to change subscription pricing with reasonable notice.",
  },
  {
    title: "5. Acceptable Use",
    content:
      "You agree not to:\n\n• Use the App for any unlawful purpose\n• Attempt to reverse engineer, decompile, or disassemble any part of the App\n• Use automated tools, bots, or scripts to access or interact with the App\n• Attempt to gain unauthorised access to any part of the App or its infrastructure\n• Upload or transmit any harmful, offensive, or malicious content\n• Misrepresent your identity or affiliation with any person or organisation\n• Interfere with or disrupt the integrity or performance of the App",
  },
  {
    title: "6. Intellectual Property",
    content:
      "All content within the App — including stories, illustrations, characters, audio, animations, game mechanics, and software — is owned by or licensed to CodeKlusters and is protected by applicable intellectual property laws.\n\nYou are granted a limited, non-exclusive, non-transferable, revocable licence to use the App for personal, non-commercial purposes. You may not reproduce, distribute, modify, or commercially exploit any content from the App without our prior written consent.",
  },
  {
    title: "7. Child Safety",
    content:
      "We are committed to the safety and privacy of children. The App is designed to be age-appropriate for children aged 5 to 11. All content is reviewed to ensure it is suitable for this age group. Parents and guardians are encouraged to supervise their child's use of the App.\n\nIf you become aware of any content or behaviour within the App that you believe is inappropriate or harmful, please contact us immediately at support@codeKlusters.com.",
  },
  {
    title: "8. Disclaimers",
    content:
      'The App is provided on an "as is" and "as available" basis without warranties of any kind. We do not warrant that the App will be uninterrupted, error-free, or free of viruses or other harmful components. We do not warrant that any specific educational outcomes will be achieved through use of the App.',
  },
  {
    title: "9. Limitation of Liability",
    content:
      "To the fullest extent permitted by applicable law, CodeKlusters shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the App.\n\nOur total liability to you for any claim shall not exceed the amount you paid us in the twelve months preceding the claim.",
  },
  {
    title: "10. Termination",
    content:
      "We reserve the right to suspend or terminate your account and access to the App at any time, with or without notice, for any reason including violation of these Terms. Upon termination, your right to use the App ceases immediately.",
  },
  {
    title: "11. Governing Law",
    content:
      "These Terms are governed by and construed in accordance with the laws applicable in the jurisdiction where CodeKlusters is registered. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of that jurisdiction.",
  },
];

const PRIVACY_SECTIONS = [
  {
    title: "1. Introduction",
    content:
      'CodeKlusters ("we," "us," or "our") operates the StoryTime mobile application ("App"). This Privacy Policy explains how we collect, use, store, share, and protect your personal information when you use the App.\n\nWe are committed to protecting the privacy of all users, with particular care given to the privacy of children. By using the App, you agree to the practices described here.',
  },
  {
    title: "2. Who This Policy Applies To",
    content:
      "This policy applies to parents and guardians who create and manage accounts, and to children whose profiles are created within the App by a parent or guardian.\n\nWe do not knowingly allow children to create their own top-level accounts without parental involvement.",
  },
  {
    title: "3. Information We Collect",
    content:
      "Information you provide directly:\n\n• Email address — account creation, login, and recovery\n• Password (encrypted) — account authentication\n• Child's name — personalising the child's profile\n• Child's age — recommending appropriate content\n• Child's gender — personalising the experience\n• Child's reading level — matching stories to ability\n\nInformation generated through use:\n\n• Reading history, activity progress, coins and diamonds earned, word bag contents, and level progression — for tracking and displaying learning progress\n\nPayment information:\n\nWe do not directly collect or store payment card details. All payment transactions are processed by Apple (iOS) or Google (Android). We receive only confirmation of transaction status and subscription state.\n\nTechnical information:\n\nWe may collect basic technical data such as device type, operating system version, and app version to maintain and improve the App.",
  },
  {
    title: "4. How We Use Your Information",
    content:
      "We use the information we collect to:\n\n• Create and manage your account and child profiles\n• Deliver and personalise educational content\n• Track learning progress across stories and activities\n• Process and manage subscription status\n• Send important account-related communications\n• Improve the App's content, features, and performance\n• Comply with our legal obligations\n\nWe do not use your information for advertising. We do not sell your data to third parties.",
  },
  {
    title: "5. Children's Privacy",
    content:
      "We take the privacy of children extremely seriously.\n\nParental control: All child profiles are created and managed by a parent or guardian.\n\nData minimisation: We collect only the minimum information necessary to deliver the App's educational features. We do not collect children's precise location, contacts, photos, or any unnecessary personal data.\n\nCOPPA (USA): We comply with the Children's Online Privacy Protection Act. We do not knowingly collect personal information from children under 13 without verifiable parental consent.\n\nGDPR and UK GDPR (Europe/UK): We process personal data about children on the legal basis of legitimate interests and parental consent. Parents have the right to access, correct, or delete their child's data at any time.\n\nSaudi Arabia / Middle East: We comply with applicable data protection requirements including the Personal Data Protection Law (PDPL) of Saudi Arabia.",
  },
  {
    title: "6. Data Storage and Security",
    content:
      "Your data is stored securely using Appwrite, a backend-as-a-service platform, and on-device using encrypted local storage. We implement appropriate technical and organisational measures to protect your personal information.\n\nHowever, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.\n\nData may be stored on servers located outside your country of residence. Where this occurs, we ensure appropriate safeguards are in place.",
  },
  {
    title: "7. Data Sharing",
    content:
      "We do not sell, rent, or trade your personal information. We may share your information only in the following limited circumstances:\n\n• Service providers: Appwrite processes data on our behalf and is contractually bound to protect it\n• Payment processors: Apple and Google process payment information as described above\n• Legal requirements: We may disclose information if required by law or court order\n• Safety: We may disclose information to protect the safety of any person or address fraud",
  },
  {
    title: "8. Data Retention",
    content:
      "We retain your account and profile data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where required to retain it for legal or regulatory reasons.\n\nReading progress stored locally on your device is cleared when you uninstall the App.",
  },
  {
    title: "9. Your Rights",
    content:
      "Depending on your location, you may have the following rights:\n\n• Access — request a copy of the data we hold about you or your child\n• Correction — request correction of inaccurate or incomplete data\n• Deletion — request deletion of your account and associated data\n• Restriction — request that we restrict processing in certain circumstances\n• Portability — request a copy of your data in a portable format\n• Objection — object to certain types of data processing\n\nTo exercise any of these rights, contact us at support@codeKlusters.com. We will respond within 30 days.",
  },
  {
    title: "10. Third-Party Services",
    content:
      "The App integrates with the following third-party services:\n\n• Appwrite — backend, authentication, data storage\n• Apple In-App Purchase — subscription billing (iOS)\n• Google Play Billing — subscription billing (Android)\n• Expo / React Native — app framework\n\nWe are not responsible for the privacy practices of these services and encourage you to review their privacy policies.",
  },
  {
    title: "11. Changes to This Policy",
    content:
      'We may update this Privacy Policy from time to time. When we make significant changes, we will notify you through the App or via email. The "Last Updated" date at the top of this policy reflects the most recent revision.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TAB PILL
// ─────────────────────────────────────────────────────────────────────────────
function TabPill({ label, active, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={[tabS.pill, active && tabS.pillActive]}
      >
        <Text style={[tabS.label, active && tabS.labelActive]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const tabS = StyleSheet.create({
  pill: {
    flex: 1,
    paddingVertical: pad.sm,
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  pillActive: {
    backgroundColor: C.tealDim,
    borderColor: C.tealBorder,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textMuted,
    letterSpacing: 0.3,
  },
  labelActive: { color: C.teal },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({ title, content, index }) {
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const toggle = () => {
    const toValue = expanded ? 0 : 1;
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue,
        duration: 280,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
    setExpanded(!expanded);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const animatedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, measuredHeight || 300],
  });

  return (
    <View style={secS.card}>
      <TouchableOpacity
        style={secS.header}
        onPress={toggle}
        activeOpacity={0.75}
      >
        <View style={secS.headerLeft}>
          <View style={secS.indexBadge}>
            <Text style={secS.indexText}>{index + 1}</Text>
          </View>
          <Text style={secS.title}>{title.replace(/^\d+\.\s/, "")}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={16} color={C.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={{ height: animatedHeight, overflow: "hidden" }}>
        <View
          style={secS.body}
          onLayout={(e) => setMeasuredHeight(e.nativeEvent.layout.height + 24)}
        >
          <View style={secS.divider} />
          <Text style={secS.content}>{content}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const secS = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: pad.s,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: pad.md,
    paddingVertical: pad.sm,
    gap: pad.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.sm,
    flex: 1,
  },
  indexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.tealDim,
    borderWidth: 1,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  indexText: {
    fontFamily: FONTS.bold,
    fontSize: font.xs,
    color: C.teal,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textPri,
    flex: 1,
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: C.divider,
    marginBottom: pad.md,
  },
  body: {
    paddingHorizontal: pad.md,
    paddingBottom: pad.md,
    position: "absolute",
    width: "100%",
  },
  content: {
    fontFamily: FONTS.regular,
    fontSize: font.sm,
    color: C.textSec,
    lineHeight: font.sm * 1.7,
    letterSpacing: 0.1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT BANNER
// ─────────────────────────────────────────────────────────────────────────────
function ContactBanner() {
  return (
    <View style={cb.container}>
      <View style={cb.iconWrap}>
        <Text style={cb.icon}>✉️</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={cb.title}>Questions or Concerns?</Text>
        <Text style={cb.email}>{CONTACT_EMAIL}</Text>
      </View>
    </View>
  );
}

const cb = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.md,
    backgroundColor: C.tealDim,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: C.tealBorder,
    padding: pad.md,
    marginBottom: pad.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,188,212,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: { fontSize: font.xl },
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textPri,
    marginBottom: 2,
  },
  email: {
    fontFamily: FONTS.regular,
    fontSize: font.sm,
    color: C.teal,
    letterSpacing: 0.2,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function TermsAndPrivacy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("terms"); // "terms" | "privacy"
  const scrollRef = useRef(null);

  const sections = activeTab === "terms" ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={s.root}>
      {/* Background glows */}
      <View style={s.glowTL} pointerEvents="none" />
      <View style={s.glowBR} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top - 20, 8) }]}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={C.teal} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={s.headerTitle}>Legal</Text>
            <Text style={s.headerSub}>CodeKlusters · StoryTime</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Tab switcher */}
        <View style={s.tabBar}>
          <TabPill
            label="Terms of Service"
            active={activeTab === "terms"}
            onPress={() => switchTab("terms")}
          />
          <TabPill
            label="Privacy Policy"
            active={activeTab === "privacy"}
            onPress={() => switchTab("privacy")}
          />
        </View>

        {/* Scroll content */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
        >
          {/* Banner */}
          <View style={s.heroBanner}>
            <Text style={s.heroEmoji}>
              {activeTab === "terms" ? "📋" : "🔐"}
            </Text>
            <Text style={s.heroTitle}>
              {activeTab === "terms" ? "Terms of Service" : "Privacy Policy"}
            </Text>
            <Text style={s.heroSub}>Last updated: {LAST_UPDATED}</Text>
          </View>

          {/* Intro note */}
          <View style={s.introBox}>
            <Text style={s.introText}>
              {activeTab === "terms"
                ? "By using StoryTime, you agree to the following terms. Please read them carefully. Tap any section to expand it."
                : "We care deeply about your privacy and your child's data. This policy explains exactly what we collect and how we use it. Tap any section to expand it."}
            </Text>
          </View>

          {/* Sections */}
          {sections.map((section, i) => (
            <SectionCard
              key={`${activeTab}-${i}`}
              title={section.title}
              content={section.content}
              index={i}
            />
          ))}

          {/* Contact */}
          <View style={{ marginTop: pad.lg }}>
            <ContactBanner />
          </View>

          {/* Legal note */}
          <Text style={s.legalNote}>
            These documents were prepared for CodeKlusters / StoryTime. We
            recommend having a qualified legal professional review them,
            particularly regarding COPPA, GDPR, and jurisdiction-specific
            requirements.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  glowTL: {
    position: "absolute",
    top: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0,188,212,0.06)",
  },
  glowBR: {
    position: "absolute",
    bottom: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(150,82,217,0.06)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: pad.md,
    paddingBottom: pad.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.1)",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.tealDim,
    borderWidth: 1,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.textPri,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontFamily: FONTS.light,
    fontSize: font.xs,
    color: C.textMuted,
    letterSpacing: 0.5,
    marginTop: 1,
  },

  tabBar: {
    flexDirection: "row",
    gap: pad.s,
    marginHorizontal: pad.md,
    marginVertical: pad.sm,
    backgroundColor: C.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  scrollContent: {
    paddingHorizontal: pad.md,
    paddingTop: pad.sm,
  },

  heroBanner: {
    alignItems: "center",
    paddingVertical: pad.lg,
    marginBottom: pad.sm,
  },
  heroEmoji: { fontSize: 48, marginBottom: pad.sm },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: C.textPri,
    letterSpacing: 0.4,
    textAlign: "center",
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  heroSub: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: C.textMuted,
    marginTop: pad.xs,
    letterSpacing: 0.5,
  },

  introBox: {
    backgroundColor: C.yellowDim,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,213,79,0.2)",
    padding: pad.md,
    marginBottom: pad.md,
  },
  introText: {
    fontFamily: FONTS.regular,
    fontSize: font.sm,
    color: C.textSec,
    lineHeight: font.sm * 1.6,
    textAlign: "center",
  },

  legalNote: {
    fontFamily: FONTS.light,
    fontSize: font.xs,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: font.xs * 1.7,
    paddingHorizontal: pad.md,
    marginBottom: pad.md,
    fontStyle: "italic",
  },
});
