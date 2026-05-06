import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRIMARY_USER_KEY = "primary_user_account_id";
const DEVICE_ID_KEY = "device_id";

export async function savePrimaryUserAccountId(id) {
  //const existing = await SecureStore.getItemAsync(PRIMARY_USER_KEY);
  await SecureStore.setItemAsync(PRIMARY_USER_KEY, id);
  /** 
  if (!existing) {
    await SecureStore.setItemAsync(PRIMARY_USER_KEY, id);
  }
  */
}

export async function getPrimaryUserAccountId() {
  return SecureStore.getItemAsync(PRIMARY_USER_KEY);
}

export async function clearPrimaryUser() {
  try {
    await await SecureStore.deleteItemAsync(PRIMARY_USER_KEY);
    await await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    await AsyncStorage.clear();
  } catch (error) {
    console.error("Error clearing data:", error);
  }
}
