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
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: c.text,
  },
  heading: { fontSize: 17, color: c.text, fontWeight: "600" },
  text: { color: c.text, fontSize: 14, lineHeight: 20 },
  muted: { color: c.muted, fontSize: 13, lineHeight: 19 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  panel: {
    padding: 14,
    backgroundColor: c.panel,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  input: {
    color: c.text,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 46,
    fontSize: 14,
    backgroundColor: c.panel,
  },
  button: {
    backgroundColor: c.gold,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
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
  price: { fontSize: 17, color: c.gold, fontWeight: "600" },
  grow: { flex: 1 },
  header: { padding: 14, borderBottomWidth: 1, borderColor: c.border, gap: 8 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderColor: c.border },
  tab: { flex: 1, paddingVertical: 18, alignItems: "center" },
  small: { color: c.muted, fontSize: 12, lineHeight: 17 },
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
    <View style={styles.panel}>
      <Text style={styles.heading}>{title}</Text>
      {detail ? <Text style={styles.muted}>{detail}</Text> : null}
    </View>
  );
}
