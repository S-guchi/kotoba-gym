import type { PracticePrompt } from "./practice.js";

export const practicePrompts: PracticePrompt[] = [
  {
    id: "tech-api-cache",
    category: "tech-explanation",
    title: "API キャッシュ戦略の説明",
    prompt:
      "新しく入ったメンバーに、なぜ API レスポンスのキャッシュ戦略を見直したのか説明してください。",
    situation:
      "相手はバックエンド経験が浅く、結論先出しで要点を知りたがっています。",
    goals: [
      "最初に結論を置く",
      "現状の問題と改善後の違いを分けて話す",
      "数字や実例を1つ入れる",
    ],
  },
  {
    id: "tech-batch-delay",
    category: "tech-explanation",
    title: "バッチ遅延の原因説明",
    prompt:
      "昨夜のバッチ処理が遅延した原因と、再発防止策をチームに説明してください。",
    situation:
      "相手は障害対応中で時間がなく、簡潔で再現性のある説明を求めています。",
    goals: [
      "原因と対策を分ける",
      "技術的な根拠を短く添える",
      "再発防止を具体化する",
    ],
  },
  {
    id: "design-read-model",
    category: "design-decision",
    title: "Read Model 導入の設計判断",
    prompt:
      "一覧画面の応答改善のために Read Model を導入する判断を説明してください。",
    situation:
      "相手は設計レビュー担当で、なぜその案を選んだのかを重視しています。",
    goals: [
      "候補比較を入れる",
      "トレードオフを隠さない",
      "採用理由を最後まで一貫させる",
    ],
  },
  {
    id: "design-mobile-offline",
    category: "design-decision",
    title: "オフライン対応の優先度判断",
    prompt:
      "モバイルアプリでオフライン対応を今やるべきかどうか、設計判断として説明してください。",
    situation: "相手は PM で、技術よりも優先順位の妥当性を重視しています。",
    goals: [
      "前提条件を最初に置く",
      "対象ユーザーへの影響を示す",
      "見送る場合も代替策を述べる",
    ],
  },
  {
    id: "report-delay-stakeholder",
    category: "reporting",
    title: "リリース遅延の報告",
    prompt:
      "予定していたリリースが1週間遅れることを、関係者に報告してください。",
    situation:
      "相手は状況把握よりも、影響範囲と打ち手を先に知りたがっています。",
    goals: [
      "結論を冒頭で伝える",
      "影響範囲を具体化する",
      "次のアクションを明確にする",
    ],
  },
  {
    id: "report-risk-escalation",
    category: "reporting",
    title: "技術リスクのエスカレーション",
    prompt:
      "本番障害につながりそうな技術リスクを、上司にエスカレーションしてください。",
    situation:
      "相手は技術に詳しくないため、深掘りよりも判断材料を求めています。",
    goals: [
      "何が危ないかを一文で言う",
      "放置コストを示す",
      "欲しい判断や支援を明確にする",
    ],
  },
  {
    id: "interview-strength",
    category: "interview",
    title: "自分の強みの説明",
    prompt:
      "面接で『あなたの強みは何ですか』と聞かれた場面を想定して回答してください。",
    situation:
      "相手はエンジニア採用の面接官で、抽象論より実例を重視しています。",
    goals: [
      "強みを最初に言い切る",
      "実例で裏付ける",
      "仕事での再現性に着地する",
    ],
  },
  {
    id: "interview-conflict",
    category: "interview",
    title: "意見対立の乗り越え方",
    prompt:
      "面接で『チーム内の意見対立をどう乗り越えましたか』と聞かれた場面を想定して回答してください。",
    situation:
      "相手は協働力を見ており、感情論ではなく行動の筋道を知りたがっています。",
    goals: [
      "状況、行動、結果の順で話す",
      "自分の役割を明確にする",
      "学びで締める",
    ],
  },
];

export function getPracticePrompts(): PracticePrompt[] {
  return practicePrompts;
}

export function getPracticePromptById(id: string): PracticePrompt {
  const prompt = practicePrompts.find((item) => item.id === id);
  if (!prompt) {
    throw new Error(`Practice prompt not found: ${id}`);
  }
  return prompt;
}
