import { StyleSheet, Text, View } from "react-native";
import { palette } from "../lib/theme";
import type { AttemptEvaluation } from "../shared/practice";

export function ScoreList({
  evaluation,
}: {
  evaluation: AttemptEvaluation;
}) {
  return (
    <View style={styles.list}>
      {evaluation.scores.map((score, index) => (
        <View key={score.axis} style={styles.row}>
          <View style={styles.labelRow}>
            <Text style={styles.axis}>{score.axis}</Text>
            <Text style={styles.value}>{score.score}/5</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${(score.score / 5) * 100}%`,
                  backgroundColor: palette.score[index] ?? palette.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.comment}>{score.comment}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
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
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  value: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  track: {
    height: 10,
    backgroundColor: "#e5ded2",
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  comment: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});

