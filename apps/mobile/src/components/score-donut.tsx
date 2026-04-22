import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useThemePalette } from "../lib/use-theme-palette";
import { fonts, type ThemePalette } from "../lib/theme";

export function ScoreDonut({
  score,
  maxScore = 100,
  size = 60,
}: {
  score: number;
  maxScore?: number;
  size?: number;
}) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / maxScore, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={palette.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={palette.accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.label}>
        <Text style={[styles.value, { fontSize: size < 50 ? 11 : 14 }]}>
          {score}
        </Text>
      </View>
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    value: {
      fontFamily: fonts.mono,
      fontWeight: "500",
      color: palette.accent,
    },
  });
}
