import { StyleSheet, Text, View } from "react-native";
import { fonts, type ThemePalette } from "../../lib/theme";

const STEP_LABELS = ["テーマ", "相手", "目的"];

export function StepIndicator({
  currentStep,
  palette,
}: {
  currentStep: number;
  palette: ThemePalette;
}) {
  const styles = createStyles(palette);

  return (
    <View style={styles.row}>
      {STEP_LABELS.map((label, index) => {
        const isActive = index === currentStep;
        const isComplete = index < currentStep;

        return (
          <View key={label} style={styles.item}>
            <View
              style={[
                styles.dot,
                isActive && styles.dotActive,
                isComplete && styles.dotComplete,
              ]}
            >
              <Text
                style={[
                  styles.dotLabel,
                  (isActive || isComplete) && styles.dotLabelActive,
                ]}
              >
                {index + 1}
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                (isActive || isComplete) && styles.stepLabelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    item: {
      flex: 1,
      alignItems: "center",
      gap: 8,
    },
    dot: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.borderLight,
      backgroundColor: palette.background,
    },
    dotActive: {
      borderColor: palette.accent,
      backgroundColor: palette.accentDim,
    },
    dotComplete: {
      borderColor: palette.accent,
      backgroundColor: palette.accent,
    },
    dotLabel: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      color: palette.text3,
    },
    dotLabelActive: {
      color: palette.text,
    },
    stepLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: palette.text3,
    },
    stepLabelActive: {
      color: palette.text,
    },
  });
}
