import React from "react";
import { Icon, type IconName } from "./Icon";
import { typography, iconSizes } from "../shared/typography";
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
    ...typography.title,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: c.text,
  },
  heading: { ...typography.heading, color: c.text, fontWeight: "600" },
  text: { color: c.text, ...typography.body },
  muted: { color: c.muted, ...typography.helper },
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
    ...typography.body,
    backgroundColor: c.panel,
  },
  button: {
    maxWidth: "100%",
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
    ...typography.body,
    textAlign: "center",
    flexShrink: 1,
  },
  outline: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.border },
  outlineText: { color: c.gold },
  error: { color: c.error, ...typography.body },
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
  price: { ...typography.price, color: c.gold, fontWeight: "600" },
  grow: { flex: 1, minWidth: 0 },
  header: { padding: 14, borderBottomWidth: 1, borderColor: c.border, gap: 8 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderColor: c.border },
  tab: { flex: 1, paddingVertical: 18, alignItems: "center" },
  small: { color: c.muted, ...typography.caption },
  divider: { height: 1, backgroundColor: c.border },
  disabled: { opacity: 0.45 },
});
export function Button({
  title,
  onPress,
  busy = false,
  disabled = false,
  outline = false,
  icon,
  accessibilityLabel,
  selected,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  outline?: boolean;
  icon?: IconName;
  accessibilityLabel?: string;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || busy, busy, selected }}
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            maxWidth: "100%",
          }}
        >
          {icon ? (
            <Icon
              name={icon}
              size={iconSizes.small}
              color={outline ? c.gold : c.background}
            />
          ) : null}
          <Text style={[styles.buttonText, outline && styles.outlineText]}>
            {title}
          </Text>
        </View>
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
      <Text style={[styles.text, typography.label, { fontWeight: "600" }]}>
        {label}
      </Text>
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
