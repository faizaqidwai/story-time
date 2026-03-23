import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteProfileApi } from "../services/profileService";
import { getPrimaryUserAccountId } from "../services/identityStorage";
import { APP_CONFIG } from "../config/appConfig";
import mockProfile from "../data/mock-profile.json";
import { checkAndClearStalePending } from "../services/levelProgressionService";

const UserContext = createContext();

const STORAGE_KEYS = {
  PROFILES: "@app_profiles",
  CURRENT_PROFILE: "@app_current_profile",
  FIRST_TIME: "@app_first_time",
  USER_ACCOUNT: "@user_account",
};

export const UserProvider = ({ children }) => {
  const [userAccount, setUserAccount] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isLogout, setIsLogout] = useState(false);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      // Check if first time user
      const firstTimeFlag = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_TIME);

      // Load user account
      const storedUserAccount = await AsyncStorage.getItem(
        STORAGE_KEYS.USER_ACCOUNT,
      );

      // Load profiles
      const storedProfiles = await AsyncStorage.getItem(STORAGE_KEYS.PROFILES);
      const primaryUserAccountId = await getPrimaryUserAccountId();
      console.log(JSON.stringify(primaryUserAccountId));

      // console.log(
      //   "UserContext loadData | storedProfiles = " +
      //     JSON.stringify(storedProfiles),
      // );

      if (!storedProfiles || storedProfiles === "[]") {
        // Logout scenario - No profile exist but there is a primary user account id
        if (primaryUserAccountId) {
          setIsLogout(true);
          setProfiles([]);
        } else {
          // First time user - no profiles exist
          setIsFirstTime(true);
          setProfiles([]);
        }
      } else {
        // Existing user
        const parsedUserAccount = JSON.parse(storedUserAccount);
        const parsedProfiles = JSON.parse(storedProfiles);
        setUserAccount(parsedUserAccount);
        setProfiles(parsedProfiles);
        setIsFirstTime(false);

        // Load current profile
        if (APP_CONFIG.MOCK_ENABLED) {
          setCurrentProfile(mockProfile);
        } else {
          const storedCurrentProfile = await AsyncStorage.getItem(
            STORAGE_KEYS.CURRENT_PROFILE,
          );

          if (storedCurrentProfile) {
            const parsedCurrentProfile = JSON.parse(storedCurrentProfile);
            setCurrentProfile(parsedCurrentProfile);
          }
        }
      }
    } catch (error) {
      console.error("Error loading stored data:", error);
      setProfiles([]);
      setIsFirstTime(true);
    } finally {
      setIsLoading(false);
    }
  };

  const addCompletedStory = (profileId, storyData) => {
    setProfiles((prevProfiles) =>
      prevProfiles.map((profile) => {
        if (profile.id === profileId) {
          const updatedHistory = [...(profile.readingHistory || []), storyData];
          const updatedBadges = [...(profile.badges || [])];

          // Check if this is their first story
          if (
            updatedHistory.length === 1 &&
            !updatedBadges.includes("first_story")
          ) {
            updatedBadges.push("first_story");
          }

          const updatedProfile = {
            ...profile,
            readingHistory: updatedHistory,
            badges: updatedBadges,
          };

          // CRITICAL: Update currentProfile if this is the active profile
          if (currentProfile?.id === profileId) {
            setCurrentProfile(updatedProfile);
          }

          return updatedProfile;
        }
        return profile;
      }),
    );
  };

  const selectProfile = async (profile) => {
    try {
      setCurrentProfile(profile);
      await AsyncStorage.setItem(
        STORAGE_KEYS.CURRENT_PROFILE,
        JSON.stringify(profile),
      );
      // If another device already progressed this profile's level, clear
      // any stale pending-progression flag so the banner doesn't appear.
      await checkAndClearStalePending(profile.id, profile.playLevel ?? 1);
    } catch (error) {
      console.error("Error saving current profile:", error);
    }
  };

  const setLoginUserAccount = async (userAccount) => {
    try {
      // Set Login User Account in Context
      setUserAccount(userAccount);
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_ACCOUNT,
        JSON.stringify(userAccount),
      );

      // Set Login User Account Profiles in Context
      setProfiles(userAccount.profiles);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PROFILES,
        JSON.stringify(userAccount.profiles),
      );
      const loginProfile = userAccount.profiles[0];
      //const loginProfile = await addProfile(userAccount.profiles[0]);
      // set login profile in selected profile
      await selectProfile(loginProfile);

      // Mark as not first time anymore
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_TIME, "false");
      setIsFirstTime(false);

      return userAccount;
    } catch (error) {
      console.error("Error setting user account:", error);
      return null;
    }
  };

  const addProfile = async (newProfile) => {
    try {
      const updatedProfiles = [...profiles, newProfile];
      setProfiles(updatedProfiles);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PROFILES,
        JSON.stringify(updatedProfiles),
      );
      return newProfile;
    } catch (error) {
      console.error("Error adding profile:", error);
      return null;
    }
  };

  const updateProfile = async (updatedProfile) => {
    try {
      const updatedProfiles = profiles.map((p) =>
        p.id === updatedProfile.id ? updatedProfile : p,
      );
      setProfiles(updatedProfiles);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PROFILES,
        JSON.stringify(updatedProfiles),
      );

      if (currentProfile?.id === updatedProfile.id) {
        setCurrentProfile(updatedProfile);
        await AsyncStorage.setItem(
          STORAGE_KEYS.CURRENT_PROFILE,
          JSON.stringify(updatedProfile),
        );
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const deleteProfile = async (profileId) => {
    try {
      // 🚨 1. Prevent deleting primary/default profile
      if (userAccount?.defaultProfileId === profileId) {
        throw new Error("PRIMARY_PROFILE_DELETE_NOT_ALLOWED");
      }

      // 🚀 2. Call backend API
      await deleteProfileApi(profileId);

      // 🧹 3. Remove profile locally
      const updatedProfiles = profiles.filter((p) => p.id !== profileId);

      setProfiles(updatedProfiles);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PROFILES,
        JSON.stringify(updatedProfiles),
      );

      // 🔁 4. If deleted profile was current profile
      if (currentProfile?.id === profileId) {
        const defaultProfile = updatedProfiles.find(
          (p) => p.id === userAccount?.defaultProfileId,
        );

        if (defaultProfile) {
          setCurrentProfile(defaultProfile);
          await AsyncStorage.setItem(
            STORAGE_KEYS.CURRENT_PROFILE,
            JSON.stringify(defaultProfile),
          );
        } else if (updatedProfiles.length > 0) {
          // fallback safety
          setCurrentProfile(updatedProfiles[0]);
          await AsyncStorage.setItem(
            STORAGE_KEYS.CURRENT_PROFILE,
            JSON.stringify(updatedProfiles[0]),
          );
        } else {
          setCurrentProfile(null);
          await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_PROFILE);
        }
      }

      return true;
    } catch (error) {
      console.error("Error deleting profile:", error);
      throw error;
    }
  };

  const toggleFavorite = async (bookId) => {
    if (!currentProfile) return;

    const updatedProfile = { ...currentProfile };
    const isFavorite = updatedProfile.favorites.includes(bookId);

    if (isFavorite) {
      updatedProfile.favorites = updatedProfile.favorites.filter(
        (id) => id !== bookId,
      );
    } else {
      updatedProfile.favorites = [...updatedProfile.favorites, bookId];
    }

    await updateProfile(updatedProfile);
  };

  const addToReadingHistory = async (bookId) => {
    if (!currentProfile) return;

    const updatedProfile = { ...currentProfile };
    if (!updatedProfile.readingHistory.includes(bookId)) {
      updatedProfile.readingHistory = [
        ...updatedProfile.readingHistory,
        bookId,
      ];
      await updateProfile(updatedProfile);
    }
  };

  const clearAllData = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PROFILES,
        STORAGE_KEYS.CURRENT_PROFILE,
        STORAGE_KEYS.FIRST_TIME,
        STORAGE_KEYS.USER_ACCOUNT,
      ]);
      //await AsyncStorage.clear();
      setProfiles([]);
      setCurrentProfile(null);
      setUserAccount(null);
      setIsFirstTime(true);
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  };

  const setMockCurrentProfile = async () => {
    let storedCurrentProfile = await AsyncStorage.getItem(
      STORAGE_KEYS.CURRENT_PROFILE,
    );
    if (!storedCurrentProfile) {
      // store mock profile in AsyncStorage
      await AsyncStorage.setItem(
        STORAGE_KEYS.CURRENT_PROFILE,
        JSON.stringify(mockProfile),
      );

      // also add it to profiles list if empty
      if (!storedProfiles || storedProfiles === "[]") {
        await AsyncStorage.setItem(
          STORAGE_KEYS.PROFILES,
          JSON.stringify([mockProfile]),
        );
      }

      storedCurrentProfile = JSON.stringify(mockProfile);
      return storedCurrentProfile;
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentProfile,
        profiles,
        isLoading,
        isFirstTime,
        isLogout,
        selectProfile,
        setLoginUserAccount,
        addProfile,
        updateProfile,
        deleteProfile,
        toggleFavorite,
        addToReadingHistory,
        clearAllData,
        addCompletedStory,
        userAccount,
        setUserAccount,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};
