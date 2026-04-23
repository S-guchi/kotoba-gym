import type { Persona } from "@kotoba-gym/core";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, type ThemePalette } from "../../lib/theme";

export function PersonaCard({
  persona,
  isSelected,
  onPress,
  palette,
}: {
  persona: Persona;
  isSelected: boolean;
  onPress: () => void;
  palette: ThemePalette;
}) {
  const styles = createStyles(palette);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{persona.emoji}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>
            {isSelected ? "SELECTED" : "PERSONA"}
          </Text>
        </View>
      </View>
      <Text style={styles.name}>{persona.name}</Text>
      <Text style={styles.description}>{persona.description}</Text>
    </Pressable>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      width: "48%",
      minHeight: 168,
      borderRadius: 20,
      padding: 16,
      gap: 10,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    cardSelected: {
      borderColor: palette.accent,
      backgroundColor: palette.accentDim,
    },
    cardPressed: {
      transform: [{ scale: 0.98 }],
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    emoji: {
      fontSize: 24,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: palette.background,
    },
    badgeLabel: {
      fontFamily: fonts.mono,
      fontSize: 9,
      color: palette.text3,
      letterSpacing: 0.6,
    },
    name: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: palette.text,
    },
    description: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      color: palette.text2,
    },
  });
}
