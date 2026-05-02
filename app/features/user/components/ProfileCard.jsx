import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import React from "react";
import { COLORS, SHADOWS, FONTS } from "../../../theme";
import { font, pad, radius, size } from "../../../theme/tokens";
import { Image as ExpoImage } from "expo-image";
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
    borderRadius: radius.xl, // 20 → radius.xl (24/32)
    padding: pad.md, // 16 → pad.md (16/22)
    marginBottom: pad.sm, // 12 → pad.sm (12/16)
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
    width: size.avatarLg, // 72 → size.avatarLg (60/80) — closest to original 72
    height: size.avatarLg, // 72 → size.avatarLg
    borderRadius: size.avatarLg / 2,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: COLORS.teal,
    marginRight: pad.sm, // 14 → pad.sm (12/16)
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
  // Profile name — bold, primary
  name: {
    fontFamily: FONTS.bold,
    fontSize: font.xl, // 20 → font.xl (20/26)
    color: COLORS.textPrimary,
    marginBottom: pad.xs, // 3 → pad.xs (4/6)
  },
  // Age — light, muted
  age: {
    fontFamily: FONTS.light,
    fontSize: font.md, // 14 → font.md (15/19) — closest to 14
    color: COLORS.textMuted,
    marginBottom: pad.s, // 8 → pad.s (8/11)
  },
  levelBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: pad.sm, // 12 → pad.sm (12/16)
    paddingVertical: pad.xs, // 4 → pad.xs (4/6)
    borderRadius: radius.sm, // 12 → radius.sm (10/14)
    borderWidth: 1,
  },
  // Reading level badge text — bold, accent coloured
  levelText: {
    fontFamily: FONTS.bold,
    fontSize: font.sm, // 13 → font.sm (13/17)
    textTransform: "capitalize",
  },
  actionsContainer: {
    flexDirection: "column",
    gap: pad.s, // 8 → pad.s (8/11)
  },
  actionButton: {
    width: size.hitSm, // 36 → size.hitSm (36/48)
    height: size.hitSm, // 36 → size.hitSm
    borderRadius: size.hitSm / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderTeal,
  },
  actionIcon: {
    fontSize: font.lg, // 16 → font.lg (17/22)
  },
});
