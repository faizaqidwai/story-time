import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import ScreenWrapper from "./components/ScreenWrapper";
import ProfileCard from "./components/ProfileCard";
import { useUser } from "./_contexts/UserContext";
import { saveProfile } from "./services/profileService";

const Account = () => {
  const router = useRouter();
  const {
    profiles,
    addProfile,
    updateProfile,
    deleteProfile,
    selectProfile,
    currentProfile,
    userAccount,
  } = useUser();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    age: "",
    readingLevel: "Early", // frontend UI field
  });
  const [isSaving, setIsSaving] = useState(false);

  const readingLevels = ["Early", "Middle", "Advance"]; // frontend options

  // --------- Modal handlers ---------
  const handleProfilePress = (profile) => {
    selectProfile(profile);
    router.push("/categories");
  };

  const handleAddNew = () => {
    setEditingProfile(null);
    setFormData({ id: "", name: "", age: "", readingLevel: "Early" });
    setModalVisible(true);
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setFormData({
      id: profile.id,
      name: profile.name,
      age: profile.age.toString(),
      // map backend level (EARLY) to frontend readingLevel (Early)
      readingLevel:
        profile.level.charAt(0) + profile.level.slice(1).toLowerCase(),
    });
    setModalVisible(true);
  };

  const handleDelete = (profile) => {
    // 🚨 Prevent deleting primary profile
    if (userAccount?.defaultProfileId === profile.id) {
      Alert.alert(
        "Not Allowed",
        "You cannot delete the primary profile of this account.",
      );
      return;
    }

    Alert.alert(
      "Delete Profile",
      `Are you sure you want to delete ${profile.name}'s profile? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProfile(profile.id);
              Alert.alert("Success", "Profile deleted successfully.");
            } catch (error) {
              if (error.message === "PRIMARY_PROFILE_DELETE_NOT_ALLOWED") {
                Alert.alert(
                  "Not Allowed",
                  "You cannot delete the primary profile of this account.",
                );
              } else {
                Alert.alert(
                  "Error",
                  "Unable to delete profile. Please try again.",
                );
              }
            }
          },
        },
      ],
    );
  };

  // --------- Save / Add ---------
  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }
    if (!formData.age || parseInt(formData.age) < 1) {
      Alert.alert("Error", "Please enter a valid age");
      return;
    }

    setIsSaving(true);

    try {
      // call backend
      const savedProfile = await saveProfile(formData);

      // Map backend response to frontend format (formData only cares about readingLevel)
      const profileForContext = {
        id: savedProfile.id,
        name: savedProfile.name,
        age: savedProfile.age,
        dob: savedProfile.dob || null,
        level: savedProfile.level, // uppercase for backend
        achievements: savedProfile.achievements || [],
        favoriteBookIds: savedProfile.favoriteBookIds || [],
        createdAt: savedProfile.createdAt || null,
        updatedAt: savedProfile.updatedAt || null,
      };

      if (editingProfile) {
        await updateProfile(profileForContext);
      } else {
        await addProfile(profileForContext);
      }

      // close modal
      setModalVisible(false);
      setFormData({ id: "", name: "", age: "", readingLevel: "Early" });
      setEditingProfile(null);
    } catch (error) {
      Alert.alert("Error", "Unable to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
    setFormData({ id: "", name: "", age: "", readingLevel: "Early" });
    setEditingProfile(null);
  };

  // --------- Render ---------
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Who's Reading?</Text>

        {currentProfile && (
          <View style={styles.currentProfileBanner}>
            <Text style={styles.currentProfileText}>
              Currently: {currentProfile.name} (
              {currentProfile.level.charAt(0) +
                currentProfile.level.slice(1).toLowerCase()}
              )
            </Text>
          </View>
        )}

        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ProfileCard
              name={item.name}
              age={item.age}
              readingLevel={
                item.level.charAt(0) + item.level.slice(1).toLowerCase()
              }
              avatar={item.avatar || null} // optional placeholder if needed
              isCurrentProfile={currentProfile?.id === item.id}
              onPress={() => handleProfilePress(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListFooterComponent={
            <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
              <Text style={styles.addButtonText}>+ Add New Profile</Text>
            </TouchableOpacity>
          }
        />

        {/* Edit/Add Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingProfile ? "Edit Profile" : "Create New Profile"}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter name"
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Age</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter age"
                    keyboardType="numeric"
                    value={formData.age}
                    onChangeText={(text) =>
                      setFormData({ ...formData, age: text })
                    }
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Reading Level</Text>
                  <View style={styles.levelButtons}>
                    {readingLevels.map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.levelButton,
                          formData.readingLevel === level &&
                            styles.levelButtonActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, readingLevel: level })
                        }
                      >
                        <Text
                          style={[
                            styles.levelButtonText,
                            formData.readingLevel === level &&
                              styles.levelButtonTextActive,
                          ]}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancel}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingProfile ? "Update" : "Save"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
};

export default Account;

// ----------------- Styles -----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: "#FAF7F2",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#154D71",
    textAlign: "center",
    marginBottom: 15,
  },
  currentProfileBanner: {
    backgroundColor: "#9652D9",
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
  },
  currentProfileText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  addButton: {
    backgroundColor: "#EDE4F0",
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    borderWidth: 2,
    borderColor: "#fff",
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#154D71",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 25,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#154D71",
    textAlign: "center",
    marginBottom: 25,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  levelButtons: {
    flexDirection: "row",
    gap: 10,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  levelButtonActive: {
    backgroundColor: "#FF6B9D",
    borderColor: "#FF6B9D",
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  levelButtonTextActive: {
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E0E0E0",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  saveButton: {
    backgroundColor: "#FF6B9D",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
