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
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontSize: 30, fontFamily: "serif", color: c.text },
  heading: { fontSize: 21, color: c.text, fontWeight: "600" },
  text: { color: c.text, fontSize: 16 },
  muted: { color: c.muted, fontSize: 14, lineHeight: 21 },
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
    fontSize: 16,
    backgroundColor: c.panel,
  },
  button: {
    backgroundColor: c.gold,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 50,
  },
  buttonText: { color: c.background, fontWeight: "700", fontSize: 16 },
  outline: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.gold },
  outlineText: { color: c.gold },
  error: { color: c.error, lineHeight: 22 },
  pill: {
    padding: 12,
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
  price: { fontSize: 20, color: c.gold, fontWeight: "600" },
  grow: { flex: 1 },
  header: { padding: 14, borderBottomWidth: 1, borderColor: c.border, gap: 8 },
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
      style={[
        styles.button,
        outline && styles.outline,
        (disabled || busy) && styles.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={c.gold} />
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
    <View style={styles.panel}>
      <Text style={styles.heading}>{title}</Text>
      {detail ? <Text style={styles.muted}>{detail}</Text> : null}
    </View>
  );
}
