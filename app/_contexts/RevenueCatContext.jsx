// app/_contexts/RevenueCatContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { APP_CONFIG } from "../config/appConfig";
import { fetchSubscriptionPackages } from "../services/subscriptionService";

const rcService = APP_CONFIG.MOCK_IAP
  ? require("../services/revenueCatService.mock")
  : require("../services/revenueCatService");

const {
  configure, setUser, clearUser, fetchOfferings, getCustomerInfo,
  purchasePackage: rcPurchasePackage, restorePurchases: rcRestorePurchases,
  addCustomerInfoUpdateListener, isEntitlementActive, PREMIUM_ENTITLEMENT_ID,
} = rcService;

const RevenueCatContext = createContext(null);

function mergePackages(rcOffering, backendPackages) {
  if (!rcOffering?.availablePackages?.length || !backendPackages?.length) return [];
  const metadataMap = rcOffering.metadata?.packages ?? {};

  return rcOffering.availablePackages.reduce((acc, rcPkg) => {
    const rcIdentifier = rcPkg.identifier;
    const backendId = metadataMap[rcIdentifier];
    const backendPkg = backendPackages.find(
      (bp) => bp.id === backendId || bp.identifier === rcIdentifier,
    );
    if (!backendPkg) {
      console.warn(`[RevenueCat] No backend package for RC identifier: ${rcIdentifier}`);
      return acc;
    }
    acc.push({
      rcPackage: rcPkg,
      rcIdentifier,
      priceString: rcPkg.product?.priceString ?? "",
      price: rcPkg.product?.price ?? backendPkg.price ?? 0,
      currencyCode: rcPkg.product?.currencyCode ?? backendPkg.currency ?? "USD",
      ...backendPkg,
    });
    return acc;
  }, []);
}

export function RevenueCatProvider({ children, userAccountId, isLoggedIn }) {
  const [customerInfo, setCustomerInfo] = useState(null);
  const [enrichedPackages, setEnriched] = useState([]);
  const [offeringsLoading, setOLoading] = useState(false);
  const [customerLoading, setCLoading] = useState(false);
  const configuredRef = useRef(false);

  useEffect(() => {
    if (configuredRef.current) return;
    configure();
    configuredRef.current = true;
  }, []);

  useEffect(() => {
    if (isLoggedIn && userAccountId) {
      setUser(userAccountId).then((info) => { if (info) setCustomerInfo(info); });
    } else {
      clearUser();
      setCustomerInfo(null);
      setEnriched([]);
    }
  }, [isLoggedIn, userAccountId]);

  const loadOfferings = useCallback(async () => {
    if (!isLoggedIn) return;
    setOLoading(true);
    try {
      const [rcOfferings, backendPackages] = await Promise.all([
        fetchOfferings(),
        fetchSubscriptionPackages().catch(() => []),
      ]);
      if (rcOfferings?.current) {
        setEnriched(mergePackages(rcOfferings.current, backendPackages));
      } else {
        const fallback = (backendPackages ?? [])
          .filter((p) => p.isActive !== false && p.billingCycle !== "NONE")
          .map((p) => ({
            ...p,
            rcPackage: p,
            rcIdentifier: p.identifier ?? p.id,
            priceString: p.price ? `$${Number(p.price).toFixed(2)}` : "Free",
            currencyCode: p.currency ?? "USD",
          }));
        setEnriched(fallback);
      }
    } catch (err) {
      console.warn("[RevenueCat] loadOfferings error:", err?.message);
    } finally {
      setOLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { if (isLoggedIn) loadOfferings(); }, [isLoggedIn]);

  const refreshCustomerInfo = useCallback(async () => {
    if (!isLoggedIn) return null;
    setCLoading(true);
    try {
      const info = await getCustomerInfo();
      setCustomerInfo(info);
      return info;
    } catch (err) {
      console.warn("[RevenueCat] refreshCustomerInfo error:", err?.message);
      return null;
    } finally {
      setCLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { if (isLoggedIn) refreshCustomerInfo(); }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubscribe = addCustomerInfoUpdateListener((info) => {
      console.log("[RevenueCat] CustomerInfo updated in background");
      setCustomerInfo(info);
    });
    return unsubscribe;
  }, [isLoggedIn]);

  const purchase = useCallback(async (rcPackage) => {
    const result = await rcPurchasePackage(rcPackage);
    setCustomerInfo(result.customerInfo);
    return result;
  }, []);

  const restorePurchases = useCallback(async () => {
    const info = await rcRestorePurchases();
    setCustomerInfo(info);
    return info;
  }, []);

  const hasPremium = isEntitlementActive(customerInfo, PREMIUM_ENTITLEMENT_ID);
  const activeEntitlement = customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];

  const value = {
    enrichedPackages, offeringsLoading, reloadOfferings: loadOfferings,
    customerInfo, customerLoading, refreshCustomerInfo,
    hasPremium, activeEntitlement,
    expirationDate: activeEntitlement?.expirationDate ?? null,
    willRenew: activeEntitlement?.willRenew ?? false,
    purchase, restorePurchases,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) throw new Error("useRevenueCat must be used inside RevenueCatProvider");
  return ctx;
}

export default RevenueCatContext;
