import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, type ThemePalette } from "../../lib/theme";

export function TipChips({
  label,
  tips,
  onSelect,
  palette,
}: {
  label: string;
  tips: string[];
  onSelect: (tip: string) => void;
  palette: ThemePalette;
}) {
  const styles = createStyles(palette);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.list}>
        {tips.map((tip) => (
          <Pressable
            key={tip}
            onPress={() => onSelect(tip)}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={styles.chipLabel}>{tip}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    wrapper: {
      gap: 10,
    },
    label: {
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: 0.6,
      color: palette.text3,
    },
    list: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.border,
    },
    chipPressed: {
      transform: [{ scale: 0.98 }],
    },
    chipLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.text2,
    },
  });
}
