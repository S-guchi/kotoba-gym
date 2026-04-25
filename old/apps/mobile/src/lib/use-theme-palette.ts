import { useColorScheme } from "react-native";
import { getThemePalette } from "./theme";

export function useThemePalette() {
  return getThemePalette(useColorScheme());
}
