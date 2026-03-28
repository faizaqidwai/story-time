import { Stack } from "expo-router";
import { UserProvider } from "./_contexts/UserContext";
import { StoryActivityProvider } from "./_contexts/StoryActivityContext";
import { NotificationProvider } from "./_contexts/NotificationContext";
import { COLORS } from "./theme";
import { View, Text, StyleSheet } from "react-native";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { LevelAccessProvider } from "./_contexts/LevelAccessContext";

// ── FREE tier badge — shown in account screen header right ─────────────────
function FreeBadge() {
  return (
    <View style={badge.wrap}>
      <Text style={badge.text}>FREE</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    marginRight: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.5)",
    backgroundColor: "rgba(0,188,212,0.1)",
  },
  text: {
    fontSize: 11,
    fontWeight: "900",
    color: "#00BCD4",
    letterSpacing: 1.2,
  },
});

const RootLayout = () => {
  const [fontsLoaded] = useFonts({
    CoText: require("../assets/fonts/Co Text.otf"),
    "CoText-Bold": require("../assets/fonts/Co Text Bold.otf"),
    "CoText-Light": require("../assets/fonts/Co Text Light.otf"),
  });

  if (!fontsLoaded) return null;

  return (
    <UserProvider>
      <LevelAccessProvider>
        <StoryActivityProvider>
          <NotificationProvider>
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
                name="account"
                options={{
                  headerShown: true,
                  title: "", // ← removed "Accounts" text
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
                  headerRight: () => <FreeBadge />, // ← FREE badge on right
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
                  headerStyle: {
                    backgroundColor: COLORS.darkBg,
                  },
                  headerTitleStyle: {
                    color: COLORS.textPrimary,
                    fontWeight: "bold",
                  },
                  headerTintColor: COLORS.teal,
                }}
              />

              {/* 📖 Book Reader (read activity) */}
              <Stack.Screen
                name="book/[id]/read"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                  contentStyle: { backgroundColor: "#08081a" },
                }}
              />

              {/* 🎮 Flappy Word Game — slides up from bottom */}
              <Stack.Screen
                name="FlappyWordGame"
                options={{
                  headerShown: false,
                  animation: "slide_from_bottom",
                  gestureEnabled: false,
                }}
              />

              {/* 🎮 Speedy Cat Game — slides up from bottom */}
              <Stack.Screen
                name="DodgeCarGame"
                options={{
                  headerShown: false,
                  animation: "slide_from_bottom",
                  gestureEnabled: false,
                }}
              />

              {/* 📊 Levels — animation:"none" lets Levels.jsx run its own
               slide-from-top animation without the router interfering.
               contentStyle dark bg prevents white flash on mount. */}
              <Stack.Screen
                name="components/Levels"
                options={{
                  headerShown: false,
                  animation: "none",
                  gestureEnabled: false,
                  contentStyle: { backgroundColor: "#08081a" },
                }}
              />

              {/* 🎒 Word Bag — slides from right, dark bg */}
              <Stack.Screen
                name="components/WordBag"
                options={{
                  headerShown: false,
                  animation: "slide_from_left",
                  contentStyle: { backgroundColor: "#08081a" },
                }}
              />

              {/* 📚 Learning Path — slides from right, dark bg */}
              <Stack.Screen
                name="components/LearningPath"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                  contentStyle: { backgroundColor: "#08081a" },
                }}
              />

              {/* 📚 Progress Report — slides from right, dark bg */}
              <Stack.Screen
                name="components/Reports"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                  contentStyle: { backgroundColor: "#08081a" },
                }}
              />

              {/* 💳 Billing screens */}
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
            </Stack>
          </NotificationProvider>
        </StoryActivityProvider>
      </LevelAccessProvider>
    </UserProvider>
  );
};

export default RootLayout;
