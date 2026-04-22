import { StyleSheet, Text, View } from "react-native";
import { useThemePalette } from "../lib/use-theme-palette";
import { fonts, type ThemePalette } from "../lib/theme";

export function Tag({
  label,
  variant = "accent",
}: {
  label: string;
  variant?: "accent" | "warm";
}) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <View
      style={[
        styles.tag,
        variant === "warm" ? styles.tagWarm : styles.tagAccent,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "warm" ? styles.textWarm : styles.textAccent,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    tag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    tagAccent: {
      backgroundColor: palette.accentDim,
    },
    tagWarm: {
      backgroundColor: palette.accentWarmDim,
    },
    text: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      fontWeight: "500",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    textAccent: {
      color: palette.accent,
    },
    textWarm: {
      color: palette.accentWarm,
    },
  });
}
