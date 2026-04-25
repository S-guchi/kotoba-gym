import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemePalette } from "../lib/use-theme-palette";
import { fonts, type ThemePalette } from "../lib/theme";

export function AppShell({
  title,
  subtitle,
  children,
  right,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  right?: ReactNode;
}>) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.eyebrow}>KOTOBA GYM</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({
  children,
  tone = "surface",
}: PropsWithChildren<{
  tone?: "surface" | "accent" | "warm" | "danger";
}>) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <View
      style={[
        styles.card,
        tone === "accent" && styles.cardAccent,
        tone === "warm" && styles.cardWarm,
        tone === "danger" && styles.cardDanger,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 32,
      gap: 16,
    },
    header: {
      gap: 12,
    },
    titleWrap: {
      gap: 6,
    },
    eyebrow: {
      fontFamily: fonts.mono,
      color: palette.accent,
      fontSize: 10,
      fontWeight: "500",
      letterSpacing: 1.5,
    },
    title: {
      fontFamily: fonts.heading,
      color: palette.text,
      fontSize: 26,
      lineHeight: 30,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontFamily: fonts.body,
      color: palette.text2,
      fontSize: 13,
      lineHeight: 20,
    },
    card: {
      backgroundColor: palette.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 16,
      gap: 10,
    },
    cardAccent: {
      backgroundColor: palette.accentDim,
      borderColor: palette.accent,
    },
    cardWarm: {
      backgroundColor: palette.accentWarmDim,
      borderColor: palette.accentWarm,
    },
    cardDanger: {
      backgroundColor: palette.dangerDim,
      borderColor: palette.danger,
    },
    sectionTitle: {
      fontFamily: fonts.monoMedium,
      color: palette.text3,
      fontSize: 10,
      fontWeight: "500",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 4,
    },
  });
}
