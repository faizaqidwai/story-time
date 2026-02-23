import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import ScreenWrapper from "./components/ScreenWrapper";
import { useRouter } from "expo-router";
import { useUser } from "./_contexts/UserContext";
import {
  loginWithPrimaryAccount,
  loginWithEmail,
  fetchUserAccount,
} from "./services/authService";
import { saveAccessToken } from "./services/tokenStorage";

const Login = () => {
  const router = useRouter();
  const { setLoginUserAccount } = useUser();
  const { clearAllData } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    clearAllData();
  }, []);

  /*
  PRIMARY LOGIN
  */
  const handlePrimaryLogin = async () => {
    try {
      setIsLoading(true);

      const loginResponse = await loginWithPrimaryAccount();

      await saveAccessToken(loginResponse.token);

      const userAccount = await fetchUserAccount();

      await setLoginUserAccount(userAccount);

      router.replace("/categories");
    } catch (error) {
      Alert.alert("Error", "Unable to login with primary account.");
    } finally {
      setIsLoading(false);
    }
  };

  /*
  EMAIL LOGIN
  */
  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Email and password are required.");
      return;
    }

    try {
      setIsLoading(true);

      const loginResponse = await loginWithEmail(email, password);

      await saveAccessToken(loginResponse.tokenDetails.token);

      const userAccount = await fetchUserAccount();

      await setLoginUserAccount(userAccount);

      router.replace("/categories");
    } catch (error) {
      Alert.alert("Error", "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome Back</Text>

        {/* PRIMARY ACCOUNT LOGIN */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handlePrimaryLogin}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            Login with Primary Account
          </Text>
        </TouchableOpacity>

        <Text style={styles.orText}>OR</Text>

        {/* EMAIL LOGIN */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleEmailLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FAF7F2",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#154D71",
    textAlign: "center",
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: "#9652D9",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  orText: {
    textAlign: "center",
    marginVertical: 10,
    color: "#666",
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F5F5F5",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  loginButton: {
    backgroundColor: "#FF6B9D",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
