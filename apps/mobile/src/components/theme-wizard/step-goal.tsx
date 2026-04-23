import type { Persona } from "@kotoba-gym/core";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { TipChips } from "./tip-chips";
import { fonts, type ThemePalette } from "../../lib/theme";

export function StepGoal({
  value,
  error,
  selectedPersona,
  onChangeText,
  palette,
  tips,
}: {
  value: string;
  error?: string;
  selectedPersona: Persona | null;
  onChangeText: (value: string) => void;
  palette: ThemePalette;
  tips: string[];
}) {
  const styles = createStyles(palette);

  return (
    <View style={styles.wrapper}>
      <View style={styles.copyBlock}>
        <Text style={styles.label}>Step 3</Text>
        <Text style={styles.title}>相手にどう届いてほしいかを決める</Text>
        <Text style={styles.body}>
          ゴールを短く固定すると、LLM
          がミッションと構成を絞り込みやすくなります。
        </Text>
      </View>

      {selectedPersona ? (
        <View style={styles.personaBadge}>
          <Text style={styles.personaBadgeText}>
            {selectedPersona.emoji} {selectedPersona.name}
          </Text>
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>目的</Text>
        <TextInput
          multiline
          onChangeText={onChangeText}
          placeholder="例: 設計意図を誤解なく理解してほしい"
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
    personaBadge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: palette.accentDim,
    },
    personaBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: palette.text,
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
