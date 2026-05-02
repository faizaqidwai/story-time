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
              name="features/home"
              options={{
                headerShown: false,
                animation: "none",
              }}
            />

            <Stack.Screen
              name="features/stories"
              options={{
                headerShown: false,
                animation: "none",
              }}
            />

            <Stack.Screen
              name="features/user"
              options={{
                headerShown: false,
                animation: "slide_from_left", // user/_layout.jsx handles its own animation
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="games"
              options={{
                headerShown: false,
                animation: "none", // games/_layout.jsx handles its own animation
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="features/levels"
              options={{
                headerShown: false,
                animation: "none", // levels/_layout.jsx handles its own animation
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="features/vocabulary/WordBag"
              options={{
                headerShown: false,
                animation: "slide_from_left",
                contentStyle: { backgroundColor: "#08081a" },
              }}
            />

            <Stack.Screen
              name="features/purchases"
              options={{
                headerShown: false,
                animation: "slide_from_right",
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
