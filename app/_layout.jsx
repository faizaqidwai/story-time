import { Stack } from "expo-router";
import { UserProvider, useUser } from "./_contexts/UserContext";
import { StoryActivityProvider } from "./_contexts/StoryActivityContext";
import { NotificationProvider } from "./_contexts/NotificationContext";
import { LevelAccessProvider } from "./_contexts/LevelAccessContext";
import {
  SubscriptionProvider,
  useSubscription,
} from "./_contexts/SubscriptionContext";
import PlanBadge from "./components/PlanBadge";
import { COLORS } from "./theme";
import { useFonts } from "expo-font";

// ── Dynamic plan badge — reads subscription from context ─────────────────────
// Must be a named component (not an inline arrow) so React can track hooks.
// Rendered inside AppProviders so SubscriptionContext is always available.
function HeaderPlanBadge() {
  const { planName, isFree } = useSubscription();
  return <PlanBadge planName={planName} isFree={isFree} />;
}

// ── Inner providers — inside UserProvider so useUser() is accessible ─────────
function AppProviders({ children }) {
  const { userAccount } = useUser();
  const isLoggedIn = !!userAccount?.id;

  return (
    <SubscriptionProvider isLoggedIn={isLoggedIn}>
      <LevelAccessProvider>
        <StoryActivityProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </StoryActivityProvider>
      </LevelAccessProvider>
    </SubscriptionProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const RootLayout = () => {
  const [fontsLoaded] = useFonts({
    CoText: require("../assets/fonts/Co Text.otf"),
    "CoText-Bold": require("../assets/fonts/Co Text Bold.otf"),
    "CoText-Light": require("../assets/fonts/Co Text Light.otf"),
  });

  if (!fontsLoaded) return null;

  return (
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

          {/* 👤 Account — dynamic plan badge replaces old hardcoded FREE badge */}
          <Stack.Screen
            name="account"
            options={{
              headerShown: true,
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

          {/* 📚 Book Reader */}
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

          {/* 📖 Book read activity */}
          <Stack.Screen
            name="book/[id]/read"
            options={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: { backgroundColor: "#08081a" },
            }}
          />

          {/* 🎮 Flappy Word Game */}
          <Stack.Screen
            name="FlappyWordGame"
            options={{
              headerShown: false,
              animation: "slide_from_bottom",
              gestureEnabled: false,
            }}
          />

          {/* 🎮 Dodge Car Game */}
          <Stack.Screen
            name="DodgeCarGame"
            options={{
              headerShown: false,
              animation: "slide_from_bottom",
              gestureEnabled: false,
            }}
          />

          {/* 📊 Levels */}
          <Stack.Screen
            name="components/Levels"
            options={{
              headerShown: false,
              animation: "none",
              gestureEnabled: false,
              contentStyle: { backgroundColor: "#08081a" },
            }}
          />

          {/* 🎒 Word Bag */}
          <Stack.Screen
            name="components/WordBag"
            options={{
              headerShown: false,
              animation: "slide_from_left",
              contentStyle: { backgroundColor: "#08081a" },
            }}
          />

          {/* 📚 Learning Path */}
          <Stack.Screen
            name="components/LearningPath"
            options={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: { backgroundColor: "#08081a" },
            }}
          />

          {/* 📊 Progress Reports */}
          <Stack.Screen
            name="components/Reports"
            options={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: { backgroundColor: "#08081a" },
            }}
          />

          {/* 💳 Billing — existing screens */}
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

          {/* 💳 Billing — new purchase flow screens */}
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
  );
};

export default RootLayout;
