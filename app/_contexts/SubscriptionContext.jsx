// app/_contexts/SubscriptionContext.jsx
//
// Stores the user's active subscription so any screen can read
// the current package name without re-fetching.
//
// Loaded once on app start (after login) and refreshed after a
// successful purchase via refreshSubscription().

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchMySubscription } from "../services/subscriptionService";

const SubscriptionContext = createContext(null);

// keys
const LAST_FETCH_KEY = "subscription_last_fetch_at";

// you can tweak this (for home screen use 2–5 mins)
const SUBSCRIPTION_TTL = 5 * 60 * 1000;

export function SubscriptionProvider({ children, isLoggedIn }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading]           = useState(false);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const sub = await fetchMySubscription();
      setSubscription(sub ?? null);
      await AsyncStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
    } catch {
      // Silently ignore — free users have no subscription record
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  // SMART refresh (TTL-based)
  const ensureFreshSubscription = useCallback(async () => {
    if (!isLoggedIn) return;

    const lastFetch = await AsyncStorage.getItem(LAST_FETCH_KEY);
    if (!lastFetch) {
      refresh();
      return;
    }
    const parsed = parseInt(lastFetch, 10);
    const isExpired =
      !parsed || Date.now() - parsed > SUBSCRIPTION_TTL;
        
    if (isExpired) {
      refresh();
    }
    
  }, [isLoggedIn, refresh]);

  // Load on mount and whenever login state changes
  useEffect(() => {
    if (isLoggedIn) refresh();
    else setSubscription(null);
  }, [isLoggedIn]);

  /** Call this after a successful purchase to update the context immediately */
  const refreshSubscription = useCallback(() => refresh(), [refresh]);

  const updateSubscription = useCallback(async (sub) => {
    setSubscription(sub);
    // also update timestamp when manually updating (e.g. purchase)
    await AsyncStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
  }, []);

  const value = {
    subscription,
    subscriptionLoading: loading,
    refreshSubscription,
    ensureFreshSubscription,
    updateSubscription,
    /** Convenience: display name shown in UI */
    planName: subscription?.packageName ?? "Free",
    /** True when user is on the free tier */
    isFree: !subscription || subscription.billingCycle === "NONE" || subscription.status !== "ACTIVE",
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
