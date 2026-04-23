import { Stack } from "expo-router";
import { UserProvider, useUser } from "./_contexts/UserContext";
import { StoryActivityProvider } from "./_contexts/StoryActivityContext";
import { NotificationProvider } from "./_contexts/NotificationContext";
import { LevelAccessProvider } from "./_contexts/LevelAccessContext";
import { ThemeProvider } from "./_contexts/ThemeContext";
import { useEffect } from "react";

import {
  SubscriptionProvider,
  useSubscription,
} from "./_contexts/SubscriptionContext";
import { RevenueCatProvider } from "./_contexts/RevenueCatContext";
import PlanBadge from "./components/PlanBadge";
import { COLORS } from "./theme";
import { useFonts } from "expo-font";

import { setNavigationRef, setNotifyRef } from "./services/apiClient";
import { useRouter } from "expo-router";
import { useNotify } from "./_contexts/NotificationContext";

// ── Dynamic plan badge — reads subscription from context ─────────────────────
function HeaderPlanBadge() {
  const { planName, isFree } = useSubscription();
  return <PlanBadge planName={planName} isFree={isFree} />;
}

// ── Notify wirer — must be INSIDE NotificationProvider ───────────────────────
function NotifyWirer() {
  const notify = useNotify();
  useEffect(() => {
    setNotifyRef(notify);
  }, []);
  return null;
}

// ── Inner providers — inside UserProvider so useUser() is accessible ─────────
function AppProviders({ children }) {
  const { userAccount } = useUser();
  const isLoggedIn = !!userAccount?.id;
  const userAccountId = userAccount?.id ?? null;

  return (
    // RevenueCatProvider sits inside UserProvider (needs userAccountId)
    // and outside SubscriptionProvider (subscription refresh triggers after RC purchase)
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
    CoText: require("../assets/fonts/Co-Text.otf"),
    "CoText-Bold": require("../assets/fonts/Co-Text-Bold.otf"),
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
              name="IntroCarousel"
              options={{
                headerShown: false,
                animation: "fade",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />

            <Stack.Screen
              name="AccountChoice"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />

            <Stack.Screen
              name="home"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#1a1a2e" },
              }}
            />

            <Stack.Screen
              name="account"
              options={{
                headerShown: false,
                title: "",
                headerBackTitle: "",
                animation: "slide_from_left",
                headerStyle: {
                  backgroundColor: COLORS.darkBg,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.borderTeal,
                },
                headerTitleStyle: {
                  color: COLORS.textPrimary,
                  fontSize: 20,
                  fontWeight: "bold",
                },
                headerTintColor: COLORS.teal,
                headerShadowVisible: true,
                headerRight: () => <HeaderPlanBadge />,
              }}
            />

            <Stack.Screen
              name="book/[id]"
              options={{
                headerShown: true,
                title: "Story",
                headerBackTitle: "",
                animation: "slide_from_right",
                headerStyle: { backgroundColor: COLORS.darkBg },
                headerTitleStyle: {
                  color: COLORS.textPrimary,
                  fontWeight: "bold",
                },
                headerTintColor: COLORS.teal,
              }}
            />

            <Stack.Screen
              name="book/[id]/read"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />

            <Stack.Screen
              name="FlappyWordGame"
              options={{
                headerShown: false,
                animation: "slide_from_bottom",
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="DodgeCarGame"
              options={{
                headerShown: false,
                animation: "slide_from_bottom",
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="components/Levels"
              options={{
                headerShown: false,
                animation: "none",
                gestureEnabled: false,
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />

            <Stack.Screen
              name="components/WordBag"
              options={{
                headerShown: false,
                animation: "slide_from_left",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />

            <Stack.Screen
              name="components/LearningPath"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />

            <Stack.Screen
              name="components/Reports"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />

            <Stack.Screen
              name="components/billing/PlanBillingScreen"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />
            <Stack.Screen
              name="components/billing/SubscriptionPlansScreen"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />
            <Stack.Screen
              name="components/billing/PaymentMethodScreen"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />
            <Stack.Screen
              name="components/billing/BillingHistoryScreen"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />
            <Stack.Screen
              name="components/billing/LevelSelectScreen"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />
            <Stack.Screen
              name="components/billing/PurchaseScreen"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />
          </Stack>
        </AppProviders>
      </UserProvider>
    </ThemeProvider>
  );
};

export default RootLayout;
