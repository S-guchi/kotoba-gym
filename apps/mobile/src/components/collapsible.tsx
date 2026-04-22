import { useState, type PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, palette } from "../lib/theme";

export function Collapsible({
  title,
  children,
  defaultOpen = false,
}: PropsWithChildren<{
  title: string;
  defaultOpen?: boolean;
}>) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={styles.title}>{title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-forward"}
          size={16}
          color={palette.text3}
        />
      </Pressable>
      {open && (
        <View style={styles.body}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    fontWeight: "500",
    color: palette.text,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    padding: 14,
  },
});
