/**
 * app/features/user/_layout.jsx
 *
 * Single layout that governs every screen inside features/user/.
 * Gesture dismiss is disabled — each screen has its own exit button.
 *
 * Because this layout is nested inside the root app/_layout.jsx Stack,
 * Expo Router treats each file here as name="features/user/<filename>" in the
 * root Stack. The root _layout.jsx Stack.Screen entries must use those
 * namespaced names.
 *
 */

import { Stack } from "expo-router";
import { COLORS } from "../../theme";
import PlanBadge from "./components/PlanBadge";
import { useSubscription } from "../../_contexts/SubscriptionContext";

// ── Dynamic plan badge — reads subscription from context ─────────────────────
function HeaderPlanBadge() {
  const { planName, isFree } = useSubscription();
  return <PlanBadge planName={planName} isFree={isFree} />;
}

// export default function UserLayout() {
//   return (
//     <Stack
//       screenOptions={{
//         headerShown: false,
//         contentStyle: { backgroundColor: "transparent" },
//       }}
//     >
//       <Stack.Screen
//         name="account"
//         options={{
//           headerShown: false,
//           title: "",
//           headerBackTitle: "",
//           animation: "slide_from_left",
//           headerStyle: {
//             backgroundColor: COLORS.darkBg,
//             borderBottomWidth: 1,
//             borderBottomColor: COLORS.borderTeal,
//           },
//           headerTitleStyle: {
//             color: COLORS.textPrimary,
//             fontSize: 20,
//             fontWeight: "bold",
//           },
//           headerTintColor: COLORS.teal,
//           headerShadowVisible: true,
//           headerRight: () => <HeaderPlanBadge />,
//         }}
//       />

//       <Stack.Screen
//         name="LearningPath"
//         options={{
//           headerShown: false,
//           animation: "slide_from_right",
//           contentStyle: { backgroundColor: "#08081a" },
//         }}
//       />

//       <Stack.Screen
//         name="Reports"
//         options={{
//           headerShown: false,
//           animation: "slide_from_right",
//           contentStyle: { backgroundColor: "#08081a" },
//         }}
//       />
//     </Stack>
//   );
// }
