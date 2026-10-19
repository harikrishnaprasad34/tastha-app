import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import { colors as c } from "../config";
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: c.text,
  },
  heading: { fontSize: 18, color: c.text, fontWeight: "600" },
  text: { color: c.text, fontSize: 14 },
  muted: { color: c.muted, fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  panel: {
    padding: 16,
    backgroundColor: c.panel,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  input: {
    color: c.text,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    backgroundColor: c.panel,
  },
  button: {
    backgroundColor: c.gold,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 46,
  },
  buttonText: {
    color: c.background,
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
    flexShrink: 1,
  },
  outline: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.border },
  outlineText: { color: c.gold },
  error: { color: c.error, lineHeight: 22 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 10,
  },
  active: { borderColor: c.gold, backgroundColor: c.elevated },
  image: {
    width: "100%",
    height: 280,
    resizeMode: "contain",
    backgroundColor: c.panel,
  },
  price: { fontSize: 18, color: c.text, fontWeight: "600" },
  grow: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: c.border,
    gap: 8,
  },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderColor: c.border },
  tab: { flex: 1, paddingVertical: 18, alignItems: "center" },
  small: { color: c.muted, fontSize: 12 },
  divider: { height: 1, backgroundColor: c.border },
  disabled: { opacity: 0.45 },
});
export function Button({
  title,
  onPress,
  busy = false,
  disabled = false,
  outline = false,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  outline?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && { opacity: 0.75 },
        outline && styles.outline,
        (disabled || busy) && styles.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={outline ? c.gold : c.background} />
      ) : (
        <Text style={[styles.buttonText, outline && styles.outlineText]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[styles.input, props.style]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
export function ErrorBox({
  message,
  retry,
}: {
  message?: string | null;
  retry?: () => void;
}) {
  return message ? (
    <View style={styles.panel}>
      <Text accessibilityRole="alert" style={styles.error}>
        {message}
      </Text>
      {retry ? <Button title="Retry" onPress={retry} outline /> : null}
    </View>
  ) : null;
}
export function Loading() {
  return (
    <ActivityIndicator
      style={{ padding: 24 }}
      color={c.gold}
      accessibilityLabel="Loading"
    />
  );
}
export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <View
      style={[
        styles.panel,
        { paddingVertical: 28, alignItems: "center", gap: 10 },
      ]}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 20,
          backgroundColor: c.elevated,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="bag-handle-outline" size={28} color={c.gold} />
      </View>
      <Text style={[styles.heading, { textAlign: "center" }]}>{title}</Text>
      {detail ? (
        <Text style={[styles.muted, { textAlign: "center" }]}>{detail}</Text>
      ) : null}
    </View>
  );
}

export function MenuItem({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.panel,
        {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          gap: 12,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: c.elevated,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={c.gold} />
      </View>
      <Text style={[styles.text, { flex: 1, fontWeight: "600" }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={17} color={c.muted} />
    </Pressable>
  );
}
