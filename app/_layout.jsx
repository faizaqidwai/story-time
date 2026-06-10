// app/_layout.jsx
//
// BRAND UPDATE — feature/brand-guidelines-v2
//   ✅ All retired colour tokens replaced with new theme tokens:
//      COLORS.darkBg        → COLORS.background
//      COLORS.teal          → COLORS.primary (cyan — teal is now Describe activity)
//      COLORS.borderTeal    → COLORS.borderPrimary
//      COLORS.textPrimary   → COLORS.textPrimary (same name, new value #FFFFFF)
//      "#08081a" hardcoded  → COLORS.background
//   ✅ All other logic, providers, and Stack config unchanged

import { Stack } from "expo-router";
import { UserProvider, useUser } from "./_contexts/UserContext";
import { StoryActivityProvider } from "./_contexts/StoryActivityContext";
import { NotificationProvider } from "./_contexts/NotificationContext";
import { LevelAccessProvider } from "./_contexts/LevelAccessContext";
import { ThemeProvider } from "./_contexts/ThemeContext";
import { useEffect } from "react";

import { SubscriptionProvider } from "./_contexts/SubscriptionContext";
import { RevenueCatProvider } from "./_contexts/RevenueCatContext";
import { useFonts } from "expo-font";

import { setNavigationRef, setNotifyRef } from "./services/apiClient";
import { useRouter } from "expo-router";
import { useNotify } from "./_contexts/NotificationContext";

import PlanBadge from "./features/user/components/PlanBadge";
import { useSubscription } from "./_contexts/SubscriptionContext";

import { COLORS } from "./theme";

// ── Notify wirer — must be INSIDE NotificationProvider ───────────────────────
function NotifyWirer() {
  const notify = useNotify();
  useEffect(() => {
    setNotifyRef(notify);
  }, []);
  return null;
}

// ── Dynamic plan badge — reads subscription from context ─────────────────────
function HeaderPlanBadge() {
  const { planName, isFree } = useSubscription();
  return <PlanBadge planName={planName} isFree={isFree} />;
}

// ── Inner providers — inside UserProvider so useUser() is accessible ─────────
function AppProviders({ children }) {
  const { userAccount } = useUser();
  const isLoggedIn = !!userAccount?.id;
  const userAccountId = userAccount?.id ?? null;

  return (
    <RevenueCatProvider userAccountId={userAccountId} isLoggedIn={isLoggedIn}>
      <SubscriptionProvider isLoggedIn={isLoggedIn}>
        <LevelAccessProvider>
          <StoryActivityProvider>
            <NotificationProvider>
              <NotifyWirer />
              {children}
            </NotificationProvider>
          </StoryActivityProvider>
        </LevelAccessProvider>
      </SubscriptionProvider>
    </RevenueCatProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const RootLayout = () => {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    CoText:         require("../assets/fonts/Co-Text.otf"),
    "CoText-Bold":  require("../assets/fonts/Co-Text-Bold.otf"),
    "CoText-Light": require("../assets/fonts/Co-Text-Light.otf"),
  });

  useEffect(() => {
    setNavigationRef(router);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <UserProvider>
        <AppProviders>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "none",
              contentStyle: { backgroundColor: "transparent" },
            }}
          >
            <Stack.Screen
              name="features/home/index"
              options={{
                headerShown: false,
                animation: "none",
              }}
            />

            <Stack.Screen
              name="features/stories/book/[id]"
              options={{
                headerShown: true,
                title: "Story",
                headerBackTitle: "",
                animation: "slide_from_right",
                headerStyle: {
                  backgroundColor: COLORS.background,     // ✅ was COLORS.darkBg
                },
                headerTitleStyle: {
                  color:      COLORS.textPrimary,          // ✅ same name, new value #FFFFFF
                  fontFamily: "CoText-Bold",               // ✅ explicit font — no fontWeight
                },
                headerTintColor: COLORS.primary,           // ✅ was COLORS.teal (now Describe activity)
                                                           //    COLORS.primary = cyan = correct for nav
              }}
            />

            <Stack.Screen
              name="features/stories/book/[id]/read"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: {
                  backgroundColor: COLORS.background,     // ✅ was hardcoded "#08081a"
                },
              }}
            />

            <Stack.Screen
              name="features/user/account"
              options={{
                headerShown: false,
                title: "",
                headerBackTitle: "",
                animation: "slide_from_left",
                headerStyle: {
                  backgroundColor:   COLORS.background,   // ✅ was COLORS.darkBg
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.borderPrimary, // ✅ was COLORS.borderTeal
                },
                headerTitleStyle: {
                  color:      COLORS.textPrimary,          // ✅ #FFFFFF
                  fontSize:   20,
                  fontFamily: "CoText-Bold",               // ✅ explicit font — no fontWeight
                },
                headerTintColor:    COLORS.primary,        // ✅ was COLORS.teal → now cyan
                headerShadowVisible: true,
                headerRight: () => <HeaderPlanBadge />,
              }}
            />

            <Stack.Screen
              name="features/user/learning-path"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: {
                  backgroundColor: COLORS.background,     // ✅ was hardcoded "#08081a"
                },
              }}
            />

            <Stack.Screen
              name="features/user/reports"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: {
                  backgroundColor: COLORS.background,     // ✅ was hardcoded "#08081a"
                },
              }}
            />

            <Stack.Screen
              name="games"
              options={{
                headerShown: false,
                animation: "slide_from_bottom",
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="features/levels"
              options={{
                headerShown: false,
                animation: "none",
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="features/vocabulary/WordBag"
              options={{
                headerShown: false,
                animation: "slide_from_left",
                contentStyle: {
                  backgroundColor: COLORS.background,     // ✅ was hardcoded "#08081a"
                },
              }}
            />

            <Stack.Screen
              name="features/vocabulary/VocabularyScreen"
              options={{
                headerShown: false,
                animation: "slide_from_left",
                contentStyle: {
                  backgroundColor: COLORS.background,     // ✅ was hardcoded "#08081a"
                },
              }}
            />

            <Stack.Screen
              name="features/vocabulary/CategoryScreen"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: {
                  backgroundColor: COLORS.background,     // ✅ was hardcoded "#08081a"
                },
              }}
            />

            <Stack.Screen
              name="features/purchases"
              options={{
                headerShown: false,
                animation: "slide_from_right",
              }}
            />
          </Stack>
        </AppProviders>
      </UserProvider>
    </ThemeProvider>
  );
};

export default RootLayout;
