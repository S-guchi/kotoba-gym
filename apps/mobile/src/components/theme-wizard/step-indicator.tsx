import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, type ThemePalette } from "../../lib/theme";

const STEP_LABELS = ["テーマ", "相手", "目的"];

export function StepIndicator({
  currentStep,
  onStepPress,
  palette,
}: {
  currentStep: number;
  onStepPress?: (step: number) => void;
  palette: ThemePalette;
}) {
  const styles = createStyles(palette);

  return (
    <View style={styles.row}>
      {STEP_LABELS.map((label, index) => {
        const isActive = index === currentStep;
        const isComplete = index < currentStep;
        const handleStepPress = isComplete ? onStepPress : undefined;

        const dot = (
          <View
            style={[
              styles.dot,
              isActive && styles.dotActive,
              isComplete && styles.dotComplete,
            ]}
          >
            {isComplete ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text
                style={[styles.dotLabel, isActive && styles.dotLabelActive]}
              >
                {index + 1}
              </Text>
            )}
          </View>
        );

        return (
          <View key={label} style={styles.stepGroup}>
            <View style={styles.dotRow}>
              {handleStepPress ? (
                <Pressable onPress={() => handleStepPress(index)}>
                  {dot}
                </Pressable>
              ) : (
                dot
              )}
              <Text
                style={[
                  styles.stepLabel,
                  (isActive || isComplete) && styles.stepLabelActive,
                ]}
              >
                {label}
              </Text>
            </View>
            {index < STEP_LABELS.length - 1 ? (
              <View style={[styles.line, isComplete && styles.lineComplete]} />
            ) : null}
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
      alignItems: "center",
    },
    stepGroup: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    dotRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    dot: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: palette.text3,
      backgroundColor: "transparent",
    },
    dotActive: {
      borderColor: palette.accent,
      backgroundColor: palette.surface,
    },
    dotComplete: {
      borderColor: palette.accent,
      backgroundColor: palette.accent,
    },
    dotLabel: {
      fontFamily: fonts.monoMedium,
      fontSize: 12,
      color: palette.text3,
    },
    dotLabelActive: {
      color: palette.accent,
    },
    stepLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: palette.text3,
    },
    stepLabelActive: {
      color: palette.text,
    },
    line: {
      flex: 1,
      height: 2,
      backgroundColor: palette.text3,
      marginHorizontal: 8,
      borderRadius: 1,
      opacity: 0.3,
    },
    lineComplete: {
      backgroundColor: palette.accent,
      opacity: 1,
    },
  });
}
