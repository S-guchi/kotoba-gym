import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { palette } from "../lib/theme";

export function PrimaryButton({
  children,
  onPress,
  variant = "solid",
  disabled = false,
}: PropsWithChildren<{
  onPress?: () => void;
  variant?: "solid" | "ghost";
  disabled?: boolean;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "ghost" ? styles.ghost : styles.solid,
        disabled ? styles.disabled : undefined,
        pressed && !disabled ? styles.pressed : undefined,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === "ghost" ? styles.ghostLabel : styles.solidLabel,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  solid: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: palette.border,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
  solidLabel: {
    color: palette.white,
  },
  ghostLabel: {
    color: palette.ink,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
