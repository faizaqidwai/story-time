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
import { fetchMySubscription } from "../services/subscriptionService";

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children, isLoggedIn }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading]           = useState(false);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const sub = await fetchMySubscription();
      setSubscription(sub ?? null);
    } catch {
      // Silently ignore — free users have no subscription record
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  // Load on mount and whenever login state changes
  useEffect(() => {
    if (isLoggedIn) refresh();
    else setSubscription(null);
  }, [isLoggedIn]);

  /** Call this after a successful purchase to update the context immediately */
  const refreshSubscription = useCallback(() => refresh(), [refresh]);

  const value = {
    subscription,
    subscriptionLoading: loading,
    refreshSubscription,
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
