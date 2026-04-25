import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useThemePalette } from "../lib/use-theme-palette";
import { fonts, type ThemePalette } from "../lib/theme";

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
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "ghost" ? styles.ghost : styles.solid,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
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

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    button: {
      minHeight: 54,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      borderWidth: 1,
    },
    solid: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    ghost: {
      backgroundColor: palette.surface2,
      borderColor: palette.borderLight,
    },
    label: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      fontWeight: "600",
      letterSpacing: -0.2,
    },
    solidLabel: {
      color: palette.background,
    },
    ghostLabel: {
      color: palette.text,
    },
    disabled: {
      opacity: 0.45,
    },
    pressed: {
      transform: [{ scale: 0.98 }],
    },
  });
}
