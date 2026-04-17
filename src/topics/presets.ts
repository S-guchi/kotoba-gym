import type { Topic } from "../types.js";

export const presets: Topic[] = [
  {
    topicId: "ci-improvement",
    topicTitle: "最近担当したCI改善の提案",
    checklist: [
      {
        id: "problem",
        label: "解決したい課題",
        description: "現状の何が問題だったか、具体的な痛み",
        state: "empty",
      },
      {
        id: "impact",
        label: "影響範囲と規模感",
        description: "誰が・どれくらい困っていたか",
        state: "empty",
      },
      {
        id: "solution",
        label: "提案した解決策",
        description: "具体的に何をしたか/するか",
        state: "empty",
      },
      {
        id: "metrics",
        label: "成果指標",
        description: "何をもって成功とするか、定量的な指標",
        state: "empty",
      },
      {
        id: "cost",
        label: "実現コスト",
        description: "工数・技術的難易度・リスク",
        state: "empty",
      },
      {
        id: "priority",
        label: "優先度の根拠",
        description: "なぜ今これをやるべきか",
        state: "empty",
      },
    ],
  },
  {
    topicId: "tech-debt",
    topicTitle: "チームで抱えている技術的負債と対処方針",
    checklist: [
      {
        id: "what",
        label: "負債の内容",
        description: "具体的にどの部分がどう問題なのか",
        state: "empty",
      },
      {
        id: "cause",
        label: "発生経緯",
        description: "なぜこの負債が生まれたのか、歴史的背景",
        state: "empty",
      },
      {
        id: "business-impact",
        label: "ビジネスへの影響",
        description:
          "放置するとどんな実害があるか、開発速度・障害リスクなど",
        state: "empty",
      },
      {
        id: "approach",
        label: "対処方針",
        description: "どうやって解消するか、段階的アプローチなど",
        state: "empty",
      },
      {
        id: "prioritization",
        label: "優先順位の根拠",
        description: "他のタスクと比べてなぜ今やるべきか",
        state: "empty",
      },
      {
        id: "inaction-risk",
        label: "放置リスク",
        description:
          "対処しなかった場合の最悪シナリオ、時間経過で悪化する要素",
        state: "empty",
      },
    ],
  },
  {
    topicId: "tool-introduction",
    topicTitle: "導入したい開発ツール（AI活用ツール等）の提案",
    checklist: [
      {
        id: "tool-overview",
        label: "ツールの概要",
        description: "何ができるツールなのか、基本的な機能",
        state: "empty",
      },
      {
        id: "pain-point",
        label: "解決する課題",
        description: "現状のどんな痛みを解消するのか",
        state: "empty",
      },
      {
        id: "alternatives",
        label: "代替手段との比較",
        description: "既存ツールや他の選択肢と比べた優位性",
        state: "empty",
      },
      {
        id: "adoption-cost",
        label: "導入コスト",
        description: "費用・学習コスト・移行の手間",
        state: "empty",
      },
      {
        id: "expected-benefit",
        label: "期待される効果",
        description: "導入後にどんな改善が見込めるか、定量的に",
        state: "empty",
      },
      {
        id: "risk-mitigation",
        label: "リスクと対策",
        description: "導入に伴うリスクとその軽減策",
        state: "empty",
      },
    ],
  },
];
