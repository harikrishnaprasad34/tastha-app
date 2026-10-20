import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { colors } from "../config";
import { styles as s } from "./ui";
export function MenuRow({
  title,
  detail,
  icon,
  onPress,
  last = false,
}: {
  title: string;
  detail?: string;
  icon: IconName;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: last ? 0 : 1,
        borderColor: colors.border,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: colors.elevated,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={19} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={[s.text, { fontWeight: "500" }]}>{title}</Text>
        {detail ? <Text style={s.small}>{detail}</Text> : null}
      </View>
      <Icon name="chevron" color={colors.muted} size={16} />
    </Pressable>
  );
}
