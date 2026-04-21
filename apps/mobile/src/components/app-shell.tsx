import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette } from "../lib/theme";

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
  tone = "paper",
}: PropsWithChildren<{ tone?: "paper" | "accent" | "warning" }>) {
  return (
    <View
      style={[
        styles.card,
        tone === "accent" ? styles.cardAccent : undefined,
        tone === "warning" ? styles.cardWarning : undefined,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
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
    color: palette.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2.2,
  },
  title: {
    color: palette.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
  },
  subtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.paper,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 10,
  },
  cardAccent: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  cardWarning: {
    backgroundColor: palette.warningSoft,
    borderColor: palette.warning,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
});

