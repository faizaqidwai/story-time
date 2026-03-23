import React from "react";
import { View, StyleSheet } from "react-native";

const BlobIconWrapper = ({ children, size = 90, color = "#5B6FD8" }) => {
  return (
    <View
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          backgroundColor: color,
        },
      ]}
    >
      {children}
    </View>
  );
};

export default BlobIconWrapper;

const styles = StyleSheet.create({
  blob: {
    justifyContent: "center",
    alignItems: "center",

    // Random organic feel
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,

    elevation: 8,
  },
});
