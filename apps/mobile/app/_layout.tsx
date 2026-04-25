import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerBackTitle: "戻る",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#F6F0E8" },
          headerTintColor: "#2E241B",
          contentStyle: { backgroundColor: "#F6F0E8" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Kotoba Gym" }} />
        <Stack.Screen name="history" options={{ title: "過去の整理" }} />
        <Stack.Screen
          name="session/[sessionId]/index"
          options={{ title: "整理詳細" }}
        />
        <Stack.Screen
          name="session/[sessionId]/organizing"
          options={{ title: "整理中" }}
        />
        <Stack.Screen
          name="session/[sessionId]/materials"
          options={{ title: "材料整理" }}
        />
        <Stack.Screen
          name="session/[sessionId]/conclusion"
          options={{ title: "結論選択" }}
        />
        <Stack.Screen
          name="session/[sessionId]/plan"
          options={{ title: "伝える順番" }}
        />
        <Stack.Screen
          name="session/[sessionId]/script"
          options={{ title: "説明文" }}
        />
        <Stack.Screen
          name="session/[sessionId]/rehearsal"
          options={{ title: "リハーサル" }}
        />
        <Stack.Screen
          name="session/[sessionId]/feedback"
          options={{ title: "フィードバック" }}
        />
        <Stack.Screen
          name="session/[sessionId]/saved"
          options={{ title: "保存完了" }}
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
