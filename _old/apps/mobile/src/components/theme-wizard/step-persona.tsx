import type { Persona } from "@kotoba-gym/core";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PersonaCard } from "./persona-card";
import { fonts, type ThemePalette } from "../../lib/theme";

export function StepPersona({
  personas,
  selectedPersonaId,
  error,
  isLoading,
  loadError,
  onRetry,
  onSelect,
  palette,
}: {
  personas: Persona[];
  selectedPersonaId: string;
  error?: string;
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onSelect: (personaId: string) => void;
  palette: ThemePalette;
}) {
  const styles = createStyles(palette);

  return (
    <View style={styles.wrapper}>
      <View style={styles.copyBlock}>
        <Text style={styles.title}>誰に話す？</Text>
        <Text style={styles.body}>
          相手によって論点の深さと語彙が変わります。
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={palette.accent} />
          <Text style={styles.loadingText}>ペルソナを読み込んでいます</Text>
        </View>
      ) : null}

      {loadError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>再読み込み</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !loadError ? (
        <View style={styles.grid}>
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              isSelected={persona.id === selectedPersonaId}
              onPress={() => onSelect(persona.id)}
              palette={palette}
            />
          ))}
        </View>
      ) : null}

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
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
    loadingCard: {
      borderRadius: 16,
      padding: 18,
      backgroundColor: palette.surface2,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    loadingText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text2,
    },
    errorCard: {
      borderRadius: 16,
      padding: 18,
      backgroundColor: palette.dangerDim,
      gap: 12,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.danger,
    },
    retryButton: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    retryText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: palette.text,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "space-between",
    },
    inlineError: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.danger,
    },
  });
}
