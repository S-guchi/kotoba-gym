import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fonts, palette } from "../../src/lib/theme";

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
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={palette.text2} />
          </View>
          <Text style={styles.name}>田中 エンジニア</Text>
          <Text style={styles.joined}>4月から練習を開始</Text>
        </View>

        {/* Settings list */}
        {SETTINGS.map((item, i) => (
          <Pressable key={i} style={styles.row}>
            <View>
              <Text
                style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}
              >
                {item.label}
              </Text>
              {item.sub ? (
                <Text style={styles.rowSub}>{item.sub}</Text>
              ) : null}
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

const styles = StyleSheet.create({
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
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.surface2,
    borderWidth: 2,
    borderColor: palette.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: palette.text,
    marginBottom: 2,
  },
  joined: {
    fontSize: 12,
    color: palette.text3,
  },
  row: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 14,
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
