import React from "react";
import { Image, Text, View } from "react-native";
import { colors } from "../config";

/** Keep the portrait brand artwork intact instead of stretching it into a square. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel="Tastha"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        flexShrink: 1,
      }}
    >
      <View
        style={{
          width: 36,
          height: 44,
          borderRadius: 10,
          backgroundColor: colors.elevated,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={require("../../assets/tastha-mark.png")}
          accessible={false}
          resizeMode="contain"
          style={{ width: 26, height: 36 }}
        />
      </View>
      {!compact ? (
        <Text
          style={{
            color: colors.gold,
            fontSize: 17,
            fontWeight: "700",
            letterSpacing: 2,
            flexShrink: 1,
          }}
        >
          TASTHA
        </Text>
      ) : null}
    </View>
  );
}
