import type { Scene } from "@kotoba-gym/core";

export type SceneOption = {
  id: Scene;
  title: string;
  description: string;
};

export const sceneOptions: SceneOption[] = [
  {
    id: "work_consultation",
    title: "仕事の相談",
    description: "上司や同僚に伝える前に、状況と相談事項を分けます。",
  },
  {
    id: "meeting",
    title: "会議で話すこと",
    description: "短く発言したい内容を、相手に届く順番に整えます。",
  },
  {
    id: "interview",
    title: "面接回答",
    description: "質問への回答を、結論と背景に分けて整理します。",
  },
  {
    id: "partner",
    title: "パートナーに伝えたいこと",
    description: "感情とお願いを混ぜずに、落ち着いて伝える準備をします。",
  },
  {
    id: "free",
    title: "自由に整理する",
    description: "用途を決めずに、頭の中の材料を出すところから始めます。",
  },
];

export function getSceneOption(scene: Scene) {
  return sceneOptions.find((option) => option.id === scene) ?? sceneOptions[4];
}
