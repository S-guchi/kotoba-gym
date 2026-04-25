import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { palette } from "./theme";

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 48 }}
    >
      {children}
    </ScrollView>
  );
}

export function Hero({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body: string;
}) {
  return (
    <View
      style={{
        backgroundColor: palette.ink,
        borderRadius: 28,
        borderCurve: "continuous",
        padding: 24,
        gap: 12,
      }}
    >
      {eyebrow ? (
        <Text selectable style={{ color: palette.accentSoft, fontSize: 13 }}>
          {eyebrow}
        </Text>
      ) : null}
      <Text
        selectable
        style={{ color: palette.cream, fontSize: 34, fontWeight: "800" }}
      >
        {title}
      </Text>
      <Text
        selectable
        style={{ color: "#E8D8C5", fontSize: 16, lineHeight: 24 }}
      >
        {body}
      </Text>
    </View>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.panel,
          borderColor: palette.line,
          borderRadius: 22,
          borderCurve: "continuous",
          borderWidth: 1,
          boxShadow: "0 10px 24px rgba(46, 36, 27, 0.08)",
          gap: 10,
          padding: 18,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({ children }: PropsWithChildren) {
  return (
    <Text
      selectable
      style={{ color: palette.ink, fontSize: 28, fontWeight: "800" }}
    >
      {children}
    </Text>
  );
}

export function Body({ children }: PropsWithChildren) {
  return (
    <Text
      selectable
      style={{ color: palette.muted, fontSize: 16, lineHeight: 24 }}
    >
      {children}
    </Text>
  );
}

export function PrimaryButton({
  children,
  onPress,
  disabled,
}: PropsWithChildren<{ onPress: () => void; disabled?: boolean }>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: disabled ? palette.line : palette.accent,
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 15,
      }}
    >
      <Text style={{ color: "#FFFDF8", fontSize: 16, fontWeight: "700" }}>
        {children}
      </Text>
    </Pressable>
  );
}

export function SecondaryButton({
  children,
  onPress,
}: PropsWithChildren<{ onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: "center",
        borderColor: palette.line,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 15,
      }}
    >
      <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "700" }}>
        {children}
      </Text>
    </Pressable>
  );
}

export function Chip({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: palette.accentSoft,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text selectable style={{ color: palette.ink, fontWeight: "700" }}>
        {children}
      </Text>
    </View>
  );
}

export function LoadingState({ text }: { text: string }) {
  return (
    <Card style={{ alignItems: "center", padding: 28 }}>
      <ActivityIndicator color={palette.accent} size="large" />
      <Text
        selectable
        style={{ color: palette.ink, fontSize: 18, fontWeight: "800" }}
      >
        {text}
      </Text>
      <Body>現状・困りごと・相談事項に分けています。</Body>
    </Card>
  );
}

export function ErrorState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <Text
        selectable
        style={{ color: palette.ink, fontSize: 18, fontWeight: "800" }}
      >
        うまく進めませんでした
      </Text>
      <Body>{message}</Body>
      {action}
    </Card>
  );
}
