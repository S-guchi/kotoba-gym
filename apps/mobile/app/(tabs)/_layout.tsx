import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemePalette } from "../../src/lib/use-theme-palette";
import { fonts } from "../../src/lib/theme";

export default function TabLayout() {
  const palette = useThemePalette();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: 82,
          paddingTop: 10,
          paddingBottom: 12,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.text3,
        tabBarLabelStyle: {
          fontFamily: fonts.mono,
          fontSize: 10,
          fontWeight: "500",
          letterSpacing: 0.3,
        },
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "履歴",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "プロフィール",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
