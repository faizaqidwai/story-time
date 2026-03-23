import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import React from "react";
import { COLORS, SHADOWS } from "../theme";

const ProfileCard = ({
  name,
  age,
  readingLevel,
  onPress,
  onEdit,
  onDelete,
  avatar,
  isCurrentProfile,
}) => {
  const getReadingLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case "early":
        return "#00BCD4"; // teal
      case "middle":
        return "#FFD54F"; // yellow
      case "advance":
        return "#FF7043"; // coral
      case "beginner":
        return "#4CAF50";
      case "intermediate":
        return "#FF9800";
      case "expert":
        return "#9C27B0";
      default:
        return "#7a9aaa";
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, isCurrentProfile && styles.activeCard]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.avatarContainer,
          isCurrentProfile && styles.avatarContainerActive,
        ]}
      >
        <Image
          source={{
            uri:
              avatar ||
              `https://ui-avatars.com/api/?name=${name}&size=120&background=00BCD4&color=fff&bold=true`,
          }}
          style={styles.avatar}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.age}>{age} years old</Text>

        <View
          style={[
            styles.levelBadge,
            {
              backgroundColor: getReadingLevelColor(readingLevel) + "33",
              borderColor: getReadingLevelColor(readingLevel),
            },
          ]}
        >
          <Text
            style={[
              styles.levelText,
              { color: getReadingLevelColor(readingLevel) },
            ]}
          >
            {readingLevel}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Text style={styles.actionIcon}>✏️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default ProfileCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.borderTeal,
    ...SHADOWS.card,
  },
  activeCard: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.surfacePurple,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: COLORS.teal,
    marginRight: 14,
  },
  avatarContainerActive: {
    borderColor: COLORS.purple,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  age: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  levelBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  actionsContainer: {
    flexDirection: "column",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderTeal,
  },
  actionIcon: {
    fontSize: 16,
  },
});
