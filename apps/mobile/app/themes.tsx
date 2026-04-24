import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../src/components/primary-button";
import { ThemeListRow } from "../src/components/theme-list-row";
import { buildHomeFeed } from "../src/lib/home-screen-helpers";
import { listPracticeSessions, listThemes } from "../src/lib/storage";
import { fonts, type ThemePalette } from "../src/lib/theme";
import { useThemePalette } from "../src/lib/use-theme-palette";
import type { PracticeSessionRecord, ThemeRecord } from "@kotoba-gym/core";

export default function ThemesScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const [themeList, sessionList] = await Promise.all([
          listThemes(),
          listPracticeSessions(),
        ]);

        if (!isActive) {
          return;
        }

        setThemes(themeList);
        setSessions(sessionList);
        setError(null);
      } catch (cause) {
        if (!isActive) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "テーマを読み込めませんでした。",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const homeFeed = buildHomeFeed({ themes, sessions });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        >
          <Ionicons name="chevron-back" size={18} color={palette.text2} />
          <Text style={styles.backText}>ホーム</Text>
        </Pressable>

        <View style={styles.headerSection}>
          <Text style={styles.title}>テーマ一覧</Text>
          <Text style={styles.subtitle}>
            これまでに作ったテーマをまとめて見返せます。
          </Text>
        </View>

        <PrimaryButton onPress={() => router.push("/theme/new")}>
          新しいテーマを作る
        </PrimaryButton>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>読み込みに失敗しました</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : null}

        {!error && homeFeed.themeRows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>まだテーマはありません。</Text>
            <Text style={styles.emptyBody}>
              新しいテーマを作ると、ここに一覧で並びます。
            </Text>
          </View>
        ) : homeFeed.themeRows.length > 0 ? (
          <View style={styles.list}>
            {homeFeed.themeRows.map((row) => (
              <ThemeListRow
                key={row.theme.id}
                row={row}
                onPress={() =>
                  router.push({
                    pathname: "/theme/[themeId]",
                    params: { themeId: row.theme.id },
                  })
                }
              />
            ))}
          </View>
        ) : null}
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
    scroll: {
      paddingTop: 18,
      paddingBottom: 24,
      paddingHorizontal: 20,
      gap: 16,
    },
    loadingText: {
      fontFamily: fonts.body,
      color: palette.text2,
      fontSize: 14,
      textAlign: "center",
      marginTop: 40,
    },
    backBtn: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
    },
    backText: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text2,
      letterSpacing: 0.4,
    },
    headerSection: {
      gap: 4,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: palette.text,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.text3,
    },
    errorCard: {
      backgroundColor: palette.dangerDim,
      borderRadius: 18,
      padding: 16,
      gap: 6,
    },
    errorTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.danger,
    },
    errorBody: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      color: palette.text2,
    },
    emptyCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 18,
      padding: 18,
      gap: 8,
    },
    emptyTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: palette.text,
    },
    emptyBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 22,
      color: palette.text2,
    },
    list: {
      gap: 8,
    },
  });
}
