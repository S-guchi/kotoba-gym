import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../src/components/primary-button";
import { generatePersonalizedPrompts } from "../../src/lib/api";
import {
  getPersonalizationProfile,
  getPersonalizedPrompts,
  resetPersonalization,
} from "../../src/lib/personalization-storage";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { fonts, type ThemePalette } from "../../src/lib/theme";
import type { PersonalizationProfile } from "@kotoba-gym/core";

const SETTINGS: readonly {
  label: string;
  sub: string;
  danger?: boolean;
}[] = [
  { label: "通知設定", sub: "毎日 20:00" },
  { label: "ヘルプ", sub: "" },
  { label: "利用規約", sub: "" },
  { label: "ログアウト", sub: "", danger: true },
];

function ProfileSection({
  label,
  items,
  onEdit,
}: {
  label: string;
  items: string[];
  onEdit: () => void;
}) {
  const palette = useThemePalette();
  const styles = createStyles(palette);

  return (
    <View style={styles.profileSection}>
      <View style={styles.profileSectionHeader}>
        <Text style={styles.profileSectionLabel}>{label}</Text>
        <Pressable onPress={onEdit}>
          <Text style={styles.profileSectionEdit}>編集</Text>
        </Pressable>
      </View>

      <View style={styles.profileSectionChipRow}>
        {items.map((item) => (
          <View key={item} style={styles.profileSectionChip}>
            <Text style={styles.profileSectionChipText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function buildRoleItems(profile: PersonalizationProfile) {
  return [profile.role, profile.roleText].filter(Boolean);
}

function buildStrengthItems(profile: PersonalizationProfile) {
  return [...profile.strengths, profile.strengthsText].filter(Boolean);
}

function buildTechStackItems(profile: PersonalizationProfile) {
  return [...profile.techStack, profile.techStackText].filter(Boolean);
}

export default function ProfileScreen() {
  const palette = useThemePalette();
  const styles = createStyles(palette);
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<PersonalizationProfile | null>(null);
  const [personalizedCount, setPersonalizedCount] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    void (async () => {
      try {
        const [savedProfile, prompts] = await Promise.all([
          getPersonalizationProfile(),
          getPersonalizedPrompts(),
        ]);

        setProfile(savedProfile);
        setPersonalizedCount(prompts?.length ?? 0);
        setError(null);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "プロフィールを読み込めませんでした。",
        );
      }
    })();
  }, [isFocused]);

  async function handleRegenerate() {
    if (!profile || isRegenerating) {
      return;
    }

    try {
      setIsRegenerating(true);
      setError(null);
      const prompts = await generatePersonalizedPrompts(profile);
      setPersonalizedCount(prompts.length);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "お題の再生成に失敗しました。",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleReset() {
    if (isResetting) {
      return;
    }

    try {
      setIsResetting(true);
      await resetPersonalization();
      setProfile(null);
      setPersonalizedCount(0);
      router.push("/onboarding");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "プロフィールのリセットに失敗しました。",
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
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

        <View style={styles.avatarSection}>
          <View style={styles.avatarGlow} />
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🏋️</Text>
          </View>
          <Text style={styles.name}>{profile?.role ?? "エンジニア"}</Text>
          <Text style={styles.joined}>4月から練習を開始</Text>
          <View style={styles.personalizedStatus}>
            <Ionicons
              name="sparkles-outline"
              size={14}
              color={palette.accent}
            />
            <Text style={styles.personalizedStatusText}>
              個人化お題 {personalizedCount} 件
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              プロフィールを更新できませんでした
            </Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : null}

        {profile ? (
          <>
            <ProfileSection
              items={buildRoleItems(profile)}
              label="技術領域"
              onEdit={() => router.push("/onboarding")}
            />

            {buildStrengthItems(profile).length > 0 ? (
              <ProfileSection
                items={buildStrengthItems(profile)}
                label="強み"
                onEdit={() => router.push("/onboarding")}
              />
            ) : null}

            {buildTechStackItems(profile).length > 0 ? (
              <ProfileSection
                items={buildTechStackItems(profile)}
                label="技術スタック"
                onEdit={() => router.push("/onboarding")}
              />
            ) : null}

            {profile.scenarios.length > 0 ? (
              <ProfileSection
                items={profile.scenarios}
                label="練習したい場面"
                onEdit={() => router.push("/onboarding")}
              />
            ) : null}

            <View style={styles.actionGroup}>
              <PrimaryButton
                disabled={isRegenerating}
                onPress={() => void handleRegenerate()}
              >
                {isRegenerating ? "生成中..." : "✦ お題を再生成する"}
              </PrimaryButton>
              <PrimaryButton
                disabled={isResetting}
                onPress={() => void handleReset()}
                variant="ghost"
              >
                {isResetting ? "準備中..." : "オンボーディングをやり直す"}
              </PrimaryButton>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              まだプロフィールが設定されていません
            </Text>
            <Text style={styles.emptyBody}>
              あなた向けのお題を生成するために、4つの質問に答えてください。
            </Text>
            <PrimaryButton onPress={() => router.push("/onboarding")}>
              プロフィールを設定する
            </PrimaryButton>
          </View>
        )}

        <View style={styles.settingsHeader}>
          <Text style={styles.settingsHeaderText}>設定</Text>
        </View>

        {SETTINGS.map((item) => (
          <Pressable key={item.label} style={styles.row}>
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

        {(isRegenerating || isResetting) && !error ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color={palette.accent} size="small" />
            <Text style={styles.inlineLoadingText}>
              {isRegenerating
                ? "個人化お題を更新しています"
                : "プロフィールを初期化しています"}
            </Text>
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
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
    },
    backBtn: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      marginBottom: 12,
    },
    backText: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text2,
      letterSpacing: 0.4,
    },
    avatarSection: {
      alignItems: "center",
      marginBottom: 22,
      paddingVertical: 12,
    },
    avatarGlow: {
      position: "absolute",
      top: 2,
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
      borderWidth: 2,
      borderColor: palette.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    avatarEmoji: {
      fontSize: 28,
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
      marginBottom: 12,
    },
    personalizedStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    personalizedStatusText: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text2,
      letterSpacing: 0.4,
    },
    profileSection: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    profileSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    profileSectionLabel: {
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.text3,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    profileSectionEdit: {
      fontFamily: fonts.mono,
      fontSize: 10,
      color: palette.accent,
      letterSpacing: 0.5,
    },
    profileSectionChipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    profileSectionChip: {
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.borderLight,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    profileSectionChipText: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.text2,
    },
    actionGroup: {
      gap: 10,
      marginTop: 6,
      marginBottom: 20,
    },
    emptyCard: {
      backgroundColor: palette.surface2,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 16,
      padding: 20,
      gap: 12,
      marginBottom: 20,
    },
    emptyTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: palette.text,
    },
    emptyBody: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 21,
      color: palette.text2,
    },
    settingsHeader: {
      marginBottom: 10,
    },
    settingsHeaderText: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: palette.text3,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    row: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
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
    errorCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: 16,
      padding: 16,
      gap: 6,
      marginBottom: 12,
    },
    errorTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.text,
    },
    errorBody: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      color: palette.text2,
    },
    inlineLoading: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingTop: 12,
    },
    inlineLoadingText: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.text3,
    },
  });
}
