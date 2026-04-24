import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  formatLastPracticed,
  type ThemeListRowItem,
} from "../lib/home-screen-helpers";
import { fonts, type ThemePalette } from "../lib/theme";
import { useThemePalette } from "../lib/use-theme-palette";
import { ScoreDonut } from "./score-donut";

export function ThemeListRow({
  row,
  onPress,
}: {
  row: ThemeListRowItem;
  onPress: () => void;
}) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.themeRow, pressed && styles.pressedCard]}
      onPress={onPress}
    >
      <View style={styles.scoreBadge}>
        {row.previousScore === null ? (
          <Text style={styles.emptyScoreText}>—</Text>
        ) : (
          <ScoreDonut score={row.previousScore} size={42} />
        )}
      </View>
      <View style={styles.themeRowBody}>
        <Text numberOfLines={1} style={styles.themeRowTitle}>
          {row.theme.title}
        </Text>
        <Text numberOfLines={1} style={styles.themeRowMeta}>
          {row.theme.persona.name} / {row.theme.durationLabel} /{" "}
          {formatLastPracticed(row.lastPracticedAt)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.text3} />
    </Pressable>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    pressedCard: {
      opacity: 0.78,
    },
    themeRow: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    scoreBadge: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyScoreText: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: palette.border,
      textAlign: "center",
      lineHeight: 40,
      fontFamily: fonts.monoMedium,
      fontSize: 16,
      color: palette.text3,
      backgroundColor: palette.surface2,
    },
    themeRowBody: {
      flex: 1,
      gap: 4,
      minWidth: 0,
    },
    themeRowTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: palette.text,
    },
    themeRowMeta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.text2,
    },
  });
}
