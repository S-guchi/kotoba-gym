import type { Persona } from "@kotoba-gym/core";

export const defaultPersonas: Persona[] = [
  {
    id: "persona-new-member",
    name: "新メンバー",
    description:
      "最近チームに加わったばかりで、プロジェクトの背景知識が少ない。",
    emoji: "🧑‍💻",
  },
  {
    id: "persona-interviewer",
    name: "面接官",
    description: "技術的な深さと論理的な説明力を重視する採用担当。",
    emoji: "👔",
  },
  {
    id: "persona-manager",
    name: "上司",
    description: "ビジネスインパクトと優先度を気にするマネージャー。",
    emoji: "📊",
  },
  {
    id: "persona-non-engineer",
    name: "非エンジニア",
    description: "技術用語に馴染みがなく、平易な言葉での説明を求める。",
    emoji: "🙋",
  },
];
