import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../../src/lib/theme";

const SETTINGS: readonly {
  label: string;
  sub: string;
  danger?: boolean;
}[] = [
  { label: "表示名の変更", sub: "田中 エンジニア" },
  { label: "通知設定", sub: "毎日 20:00" },
  { label: "ヘルプ", sub: "" },
  { label: "利用規約", sub: "" },
  { label: "ログアウト", sub: "", danger: true },
];

export default function ProfileScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarGlow} />
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={palette.text2} />
          </View>
          <Text style={styles.name}>田中 エンジニア</Text>
          <Text style={styles.joined}>4月から練習を開始</Text>
        </View>

        {SETTINGS.map((item, i) => (
          <Pressable key={i} style={styles.row}>
            <View>
              <Text
                style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}
              >
                {item.label}
              </Text>
              {item.sub ? <Text style={styles.rowSub}>{item.sub}</Text> : null}
            </View>
            {!item.danger && (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={palette.text3}
              />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 32,
    },
    avatarSection: {
      alignItems: "center",
      marginBottom: 28,
      paddingVertical: 12,
    },
    avatarGlow: {
      position: "absolute",
      top: 6,
      width: 132,
      height: 132,
      borderRadius: 66,
      backgroundColor: palette.accentDim,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.borderLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    name: {
      fontFamily: fonts.heading,
      fontSize: 24,
      color: palette.text,
      marginBottom: 4,
    },
    joined: {
      fontSize: 12,
      color: palette.text3,
    },
    row: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 14,
      padding: 15,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rowLabel: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: palette.text,
    },
    rowLabelDanger: {
      color: palette.danger,
    },
    rowSub: {
      fontSize: 11,
      color: palette.text3,
      marginTop: 2,
    },
  });
}
