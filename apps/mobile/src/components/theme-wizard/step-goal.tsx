import { StyleSheet, Text, TextInput, View } from "react-native";
import { TipChips } from "./tip-chips";
import { fonts, type ThemePalette } from "../../lib/theme";

export function StepGoal({
  value,
  error,
  onChangeText,
  palette,
  tips,
}: {
  value: string;
  error?: string;
  onChangeText: (value: string) => void;
  palette: ThemePalette;
  tips: string[];
}) {
  const styles = createStyles(palette);

  return (
    <View style={styles.wrapper}>
      <View style={styles.copyBlock}>
        <Text style={styles.title}>どう届いてほしい？</Text>
        <Text style={styles.body}>
          ゴールを短く固定するほど構成が絞れます。
        </Text>
      </View>

      <TipChips
        label="例をタップで使う"
        tips={tips}
        onSelect={onChangeText}
        palette={palette}
      />

      <View style={styles.field}>
        <TextInput
          multiline
          onChangeText={onChangeText}
          placeholder="例をタップ、または自由に入力"
          placeholderTextColor={palette.text3}
          style={styles.textarea}
          value={value}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    wrapper: {
      gap: 18,
    },
    copyBlock: {
      gap: 6,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 26,
      lineHeight: 32,
      color: palette.text,
    },
    body: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    field: {
      gap: 8,
    },
    textarea: {
      minHeight: 120,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: palette.background,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: palette.text,
      textAlignVertical: "top",
    },
    error: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.danger,
    },
  });
}
