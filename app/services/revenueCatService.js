// app/services/revenueCatService.js
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform } from "react-native";
import { APP_CONFIG } from "../config/appConfig";

const RC_KEY =
  Platform.OS === "ios"
    ? APP_CONFIG.REVENUECAT_IOS_KEY
    : APP_CONFIG.REVENUECAT_ANDROID_KEY;

export const PREMIUM_ENTITLEMENT_ID = "premium";

export function configure() {
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: RC_KEY });
}

export async function setUser(userAccountId) {
  try {
    const { customerInfo } = await Purchases.logIn(userAccountId);
    return customerInfo;
  } catch (err) {
    console.warn("[RevenueCat] setUser failed:", err?.message);
    return null;
  }
}

export async function clearUser() {
  try {
    await Purchases.logOut();
  } catch (err) {
    console.warn("[RevenueCat] clearUser:", err?.message);
  }
}

export async function fetchOfferings() {
  try {
    return await Purchases.getOfferings();
  } catch (err) {
    console.warn("[RevenueCat] fetchOfferings failed:", err?.message);
    return null;
  }
}

export async function getCustomerInfo() {
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.warn("[RevenueCat] getCustomerInfo failed:", err?.message);
    return null;
  }
}

export function isEntitlementActive(customerInfo, entitlementId = PREMIUM_ENTITLEMENT_ID) {
  return customerInfo?.entitlements?.active?.[entitlementId] !== undefined ?? false;
}

export async function purchasePackage(rcPackage) {
  const { customerInfo, transaction } = await Purchases.purchasePackage(rcPackage);
  return { customerInfo, transaction };
}

export async function restorePurchases() {
  try {
    return await Purchases.restorePurchases();
  } catch (err) {
    console.warn("[RevenueCat] restorePurchases failed:", err?.message);
    throw err;
  }
}

export function addCustomerInfoUpdateListener(callback) {
  Purchases.addCustomerInfoUpdateListener(callback);
  return () => Purchases.removeCustomerInfoUpdateListener(callback);
}
