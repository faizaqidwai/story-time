import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  Modal,
  Pressable,
} from "react-native";
import React, { useState } from "react";
import { Stack, useRouter } from "expo-router";
import { UserProvider } from "./_contexts/UserContext";
import { Ionicons } from "@expo/vector-icons";
import { logoutUser } from "./services/authService";
import { clearAuthTokens } from "./services/tokenStorage";

const RootLayout = () => {
  const router = useRouter();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const ProfileButton = () => (
    <TouchableOpacity
      onPress={() => setDropdownVisible(!dropdownVisible)}
      style={styles.profileIconWrapper}
    >
      <Ionicons name="person" size={20} color="#fff" />
    </TouchableOpacity>
  );

  const handleMenuOption = async (option) => {
    setDropdownVisible(false);

    switch (option) {
      case "progress":
        router.push("/progress");
        break;
      case "change":
        router.push("/account");
        break;
      case "signout":
        try {
          await logoutUser();
          await clearAuthTokens();

          // Force full app reset
          router.replace("/login");
        } catch (error) {
          console.log("Logout failed", error);
        }
        break;
    }
  };

  return (
    <UserProvider>
      <View style={styles.overlay} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#F8F2FA",
            height: 100,
            shadowColor: "transparent",
          },
          headerBackTitle: "",
          headerBackTitleVisible: false,
          headerTintColor: "#1C6EA4",
          headerTitleStyle: {
            fontSize: 28,
            fontWeight: "bold",
            color: "#9652D9",
            textShadowColor: "rgba(0,0,0,0.3)",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          },
          contentStyle: { backgroundColor: "transparent" },
          headerTitleAlign: "center",
        }}
      >
        // Add this screen inside the Stack component:
        <Stack.Screen
          name="progress"
          options={{
            title: "My Progress",
            headerRight: () => <ProfileButton />,
          }}
        />
        <Stack.Screen
          name="index"
          options={{
            title: "Home",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="categories"
          options={{
            title: "Stories",
            headerRight: () => <ProfileButton />,
          }}
        />
        <Stack.Screen
          name="book/[id]"
          options={({ route }) => {
            const title = route.params?.title ?? "Story";
            return {
              title: title.length > 25 ? title.substring(0, 25) + "..." : title,
              headerBackTitleVisible: false,
              headerBackTitle: "",
              headerRight: () => <ProfileButton />,
            };
          }}
        />
        <Stack.Screen
          name="account"
          options={{
            title: "Accounts",
            headerRight: () => null,
          }}
        />
      </Stack>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleMenuOption("progress")}
            >
              <Text style={styles.dropdownIcon}>📊</Text>
              <Text style={styles.dropdownText}>View Progress</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleMenuOption("change")}
            >
              <Text style={styles.dropdownIcon}>👤</Text>
              <Text style={styles.dropdownText}>Change Profile</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleMenuOption("signout")}
            >
              <Text style={styles.dropdownIcon}>🚪</Text>
              <Text style={styles.dropdownText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </UserProvider>
  );
};

export default RootLayout;

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  profileButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    //  marginRight: 10,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderColor: "#fff",
  },
  profileIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF6B9D",
    alignItems: "center",
    justifyContent: "center",
  },

  // Dropdown Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  dropdown: {
    position: "absolute",
    top: 90, // Position below header
    right: 15,
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 12,
  },
});
