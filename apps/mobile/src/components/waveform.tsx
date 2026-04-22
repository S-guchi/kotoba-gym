import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { palette } from "../lib/theme";

const BAR_COUNT = 28;
const BAR_WIDTH = 3;
const MIN_HEIGHT = 8;
const MAX_HEIGHT = 28;

function WaveformBar({
  isRecording,
  index,
}: {
  isRecording: boolean;
  index: number;
}) {
  const height = useSharedValue(MIN_HEIGHT);

  useEffect(() => {
    if (isRecording) {
      const duration = 300 + Math.random() * 400;
      const delay = index * 30;
      const targetHeight = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT);
      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(targetHeight, {
              duration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(MIN_HEIGHT + Math.random() * 8, {
              duration: duration * 0.8,
              easing: Easing.inOut(Easing.ease),
            }),
          ),
          -1,
          true,
        ),
      );
    } else {
      height.value = withTiming(MIN_HEIGHT, { duration: 300 });
    }
  }, [isRecording, height, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: isRecording ? palette.accent : palette.borderLight },
        animatedStyle,
      ]}
    />
  );
}

export function Waveform({ isRecording }: { isRecording: boolean }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <WaveformBar key={i} isRecording={isRecording} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 40,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 2,
  },
});
