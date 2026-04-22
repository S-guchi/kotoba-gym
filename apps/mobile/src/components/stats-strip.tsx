import { StyleSheet, Text, View } from "react-native";
import { useThemePalette } from "../lib/use-theme-palette";
import { fonts, type ThemePalette } from "../lib/theme";

export function StatsStrip({
  items,
}: {
  items: { label: string; value: string; unit?: string }[];
}) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <View style={styles.container}>
      {items.map((item, i) => (
        <View
          key={i}
          style={[styles.cell, i < items.length - 1 && styles.cellBorder]}
        >
          <Text style={styles.value}>
            {item.value}
            {item.unit ? <Text style={styles.unit}>{item.unit}</Text> : null}
          </Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: "row",
    },
    cell: {
      flex: 1,
      alignItems: "center",
    },
    cellBorder: {
      borderRightWidth: 1,
      borderRightColor: palette.border,
    },
    value: {
      fontFamily: fonts.mono,
      fontSize: 18,
      fontWeight: "500",
      color: palette.accent,
      letterSpacing: -0.5,
    },
    unit: {
      fontSize: 11,
      marginLeft: 1,
    },
    label: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: palette.text3,
      marginTop: 2,
    },
  });
}
