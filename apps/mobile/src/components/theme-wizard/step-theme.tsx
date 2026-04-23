import { StyleSheet, Text, TextInput, View } from "react-native";
import { TipChips } from "./tip-chips";
import { fonts, type ThemePalette } from "../../lib/theme";

export function StepTheme({
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
        <Text style={styles.label}>Step 1</Text>
        <Text style={styles.title}>何を説明したいかを言葉にする</Text>
        <Text style={styles.body}>
          いま整理したいテーマを一文で書いてください。話したい論点が曖昧でも、あとで練習用に整えます。
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>テーマ</Text>
        <TextInput
          multiline
          onChangeText={onChangeText}
          placeholder="例: API キャッシュ戦略を見直した理由"
          placeholderTextColor={palette.text3}
          style={styles.textarea}
          value={value}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <TipChips
        label="TIP"
        tips={tips}
        onSelect={onChangeText}
        palette={palette}
      />
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    wrapper: {
      gap: 20,
    },
    copyBlock: {
      gap: 10,
    },
    label: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      color: palette.accentWarm,
      letterSpacing: 1.2,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 32,
      lineHeight: 36,
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
    fieldLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.text,
    },
    textarea: {
      minHeight: 140,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 16,
      paddingVertical: 16,
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
