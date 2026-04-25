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
      <View style={styles.nameRow}>
        <Text style={styles.emoji}>{persona.emoji}</Text>
        <Text style={styles.name}>{persona.name}</Text>
      </View>
      <Text style={styles.description} numberOfLines={1}>
        {persona.description}
      </Text>
    </Pressable>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      width: "48%",
      borderRadius: 16,
      padding: 14,
      gap: 6,
      backgroundColor: palette.surface,
      borderWidth: 1.5,
      borderColor: palette.border,
    },
    cardSelected: {
      borderColor: palette.accent,
      backgroundColor: palette.accentDim,
    },
    cardPressed: {
      transform: [{ scale: 0.98 }],
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    emoji: {
      fontSize: 22,
    },
    name: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: palette.text,
    },
    description: {
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      color: palette.text2,
    },
  });
}
