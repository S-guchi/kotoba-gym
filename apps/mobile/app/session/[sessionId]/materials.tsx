import type { MaterialItem } from "@kotoba-gym/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { updateSession } from "@/src/lib/api";
import { hasEmptyMaterial } from "@/src/lib/session-flow";
import { useSession } from "@/src/lib/use-session";
import {
  Body,
  Card,
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
  Title,
} from "@/src/ui/components";
import { palette } from "@/src/ui/theme";

export default function MaterialsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const { session, ownerKey, error, loading, setSession } =
    useSession(sessionId);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.materials) {
      setItems(session.materials.items);
    }
  }, [session]);

  async function handleNext() {
    if (!session || !ownerKey || !sessionId || !session.materials) {
      return;
    }
    setSaving(true);
    const materials = { ...session.materials, items };
    const updated = await updateSession(sessionId, { ownerKey, materials });
    setSession(updated);
    setSaving(false);
    router.push({
      pathname: "/session/[sessionId]/organizing",
      params: { sessionId, step: "conclusions" },
    });
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState text="材料を読み込んでいます" />
      </Screen>
    );
  }

  if (error || !session?.materials) {
    return (
      <Screen>
        <ErrorState message={error ?? "材料がまだありません"} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Title>あなたの話の材料</Title>
        <Body>これは仮の整理です。違っていたら直してください。</Body>
      </View>

      {items.map((item, index) => (
        <Card key={item.key}>
          <Text selectable style={{ color: palette.accent, fontWeight: "800" }}>
            {item.title}
          </Text>
          <TextInput
            multiline
            onChangeText={(value) =>
              setItems((current) =>
                current.map((candidate, currentIndex) =>
                  currentIndex === index
                    ? { ...candidate, content: value }
                    : candidate,
                ),
              )
            }
            placeholder={item.placeholder ?? "まだはっきりしていません"}
            placeholderTextColor="#A08F7A"
            style={{
              color: palette.ink,
              fontSize: 16,
              lineHeight: 23,
              minHeight: 48,
            }}
            value={item.content}
          />
        </Card>
      ))}

      {hasEmptyMaterial(items) ? (
        <Body>
          空の項目があっても大丈夫です。今ある材料だけで次に進めます。
        </Body>
      ) : null}

      <PrimaryButton disabled={saving} onPress={handleNext}>
        {saving ? "保存中..." : "次へ"}
      </PrimaryButton>
    </Screen>
  );
}
