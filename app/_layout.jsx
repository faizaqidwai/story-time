import { Stack } from "expo-router";
import { UserProvider } from "./_contexts/UserContext";
import { StoryActivityProvider } from "./_contexts/StoryActivityContext";
import { COLORS } from "./theme";

const RootLayout = () => {
  return (
    <UserProvider>
      <StoryActivityProvider>
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
              title: "Accounts",
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
      </StoryActivityProvider>
    </UserProvider>
  );
};

export default RootLayout;
