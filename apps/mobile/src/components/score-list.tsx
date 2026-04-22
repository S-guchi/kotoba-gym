import { StyleSheet, Text, View } from "react-native";
import { useThemePalette } from "../lib/use-theme-palette";
import { fonts, type ThemePalette } from "../lib/theme";
import type { AttemptEvaluation } from "../shared/practice";

export function ScoreList({
  evaluation,
}: {
  evaluation: AttemptEvaluation;
}) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <View style={styles.list}>
      {evaluation.scores.map((score) => (
        <View key={score.axis} style={styles.row}>
          <View style={styles.labelRow}>
            <Text style={styles.axis}>{score.axis}</Text>
            <Text style={styles.value}>{score.score}/5</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[styles.fill, { width: `${(score.score / 5) * 100}%` }]}
            />
          </View>
          <Text style={styles.comment}>{score.comment}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    list: {
      gap: 14,
    },
    row: {
      gap: 6,
    },
    labelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    axis: {
      fontFamily: fonts.bodyMedium,
      color: palette.text,
      fontSize: 12,
      fontWeight: "500",
    },
    value: {
      fontFamily: fonts.mono,
      color: palette.text2,
      fontSize: 12,
    },
    track: {
      height: 4,
      backgroundColor: palette.borderLight,
      borderRadius: 2,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: palette.accent,
    },
    comment: {
      fontFamily: fonts.body,
      color: palette.text3,
      fontSize: 11,
      lineHeight: 16,
    },
  });
}
