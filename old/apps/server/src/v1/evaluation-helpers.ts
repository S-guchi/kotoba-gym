import { Type } from "@google/genai";
import {
  type AttemptEvaluation,
  type EvaluationScore,
  type PreviousEvaluationPayload,
  type ThemeRecord,
  scoreAxes,
} from "@kotoba-gym/core";
import { ApiError } from "./api-error.js";

export const EVALUATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING },
    summary: { type: Type.STRING },
    scores: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          axis: {
            type: Type.STRING,
            enum: [...scoreAxes],
          },
          score: { type: Type.INTEGER },
          comment: { type: Type.STRING },
        },
        required: ["axis", "score", "comment"],
      },
    },
    goodPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    improvementPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    exampleAnswer: { type: Type.STRING },
    nextFocus: { type: Type.STRING },
    comparison: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        scoreDiff: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              axis: {
                type: Type.STRING,
                enum: [...scoreAxes],
              },
              before: { type: Type.INTEGER },
              after: { type: Type.INTEGER },
              diff: { type: Type.INTEGER },
            },
            required: ["axis", "before", "after", "diff"],
          },
        },
        improvedPoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        remainingPoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        comparisonSummary: { type: Type.STRING },
      },
      required: [
        "scoreDiff",
        "improvedPoints",
        "remainingPoints",
        "comparisonSummary",
      ],
    },
  },
  required: [
    "transcript",
    "summary",
    "scores",
    "goodPoints",
    "improvementPoints",
    "exampleAnswer",
    "nextFocus",
    "comparison",
  ],
};

export function buildEvaluationPrompt(params: {
  theme: ThemeRecord;
  locale: string;
  previousEvaluationSummary?: string;
  previousEvaluation?: PreviousEvaluationPayload;
}): string {
  const previousSection = params.previousEvaluation
    ? `
## 前回の練習結果
- summary: ${params.previousEvaluation.summary}
- nextFocus: ${params.previousEvaluation.nextFocus}
- goodPoints:
${params.previousEvaluation.goodPoints.map((item) => `  - ${item}`).join("\n")}
- improvementPoints:
${params.previousEvaluation.improvementPoints.map((item) => `  - ${item}`).join("\n")}
- scores:
${params.previousEvaluation.scores
  .map((item) => `  - ${item.axis}: ${item.score} / ${item.comment}`)
  .join("\n")}
${params.previousEvaluationSummary ? `- previousEvaluationSummary: ${params.previousEvaluationSummary}` : ""}`
    : "\n## 前回の練習結果\n今回がこのテーマの初回練習です。comparison は null を返してください。";

  return `あなたはエンジニア向け口頭コミュニケーション練習コーチです。添付された音声を聞いて、回答を日本語で評価してください。

## 回答言語
${params.locale}

## テーマタイトル
${params.theme.title}

## ユーザーが説明したいこと
- テーマ: ${params.theme.userInput.theme}
- 相手: ${params.theme.persona.name}
- 相手の特徴: ${params.theme.persona.description}
- 目的: ${params.theme.userInput.goal}

## 今回のミッション
${params.theme.mission}

## 相手の前提
${params.theme.audienceSummary}

## 話すべきポイント
${params.theme.talkingPoints.map((item) => `- ${item}`).join("\n")}

## おすすめ構成
${params.theme.recommendedStructure.map((item) => `- ${item}`).join("\n")}

## 目安時間
${params.theme.durationLabel}

## 評価軸
- conclusion: 結論が先に出ているか
- structure: 話の順番やまとまりが分かりやすいか
- specificity: 具体例、数字、固有名詞があるか
- technicalValidity: 技術的な説明や判断が妥当か
- brevity: 無駄が少なく簡潔か

${previousSection}

## 出力ルール
1. transcript は音声の自然な文字起こしにしてください。
2. 音声で確認できない内容を補完・創作してはいけません。ユーザーが話していない固有名詞、事例、障害名、技術課題を勝手に追加してはいけません。
3. 聞き取れない箇所は推測せず、必要なら「[聞き取り不能]」のように明示してください。
4. 音声全体が短すぎる、無音に近い、または不明瞭で判断材料が足りない場合は、その前提を transcript / summary / improvementPoints / nextFocus に反映してください。無理にもっともらしい内容を作らないでください。
5. summary は一言総評として2文以内でまとめてください。
6. scores は5軸すべてを必ず含めてください。score は1から5です。判断材料が不足する場合は低めに評価し、comment で不足理由を明示してください。
7. goodPoints と improvementPoints は transcript に根拠がある内容だけを書いてください。引用や言い換えはよいですが、transcript に存在しない事実を追加してはいけません。
8. goodPoints は通常2個から3個ですが、十分な内容がなく良かった点を挙げられない場合は 0個でもかまいません。improvementPoints は2個から3個を基本としつつ、最低1個は返してください。十分な内容がない場合は、「結論がまだ出ていない」「相手に必要な背景が不足している」のように不足自体を指摘してください。
9. exampleAnswer は次回の参考になる短い改善例を1つ返してください。ただし今回の transcript に存在しない過去エピソードを事実として断定してはいけません。
10. nextFocus は次回の意識点を1文で返してください。
11. 前回結果がある場合だけ comparison を埋めてください。scoreDiff は全軸を含め、improvedPoints と remainingPoints は各0個から3個にしてください。
12. 前回結果がない場合は comparison を null にしてください。
13. 抽象論ではなく、このテーマと今回の発話内容に即して評価してください。相手と目的に合った説明になっているかを重視してください。

## 最重要
- 音声から確認できない内容を「それっぽい文脈」で埋めないこと。
- 迷ったら保守的に判定し、不足として返すこと。`;
}

export function normalizeScores(scores: EvaluationScore[]): EvaluationScore[] {
  const byAxis = new Map(scores.map((score) => [score.axis, score]));

  return scoreAxes.map((axis) => {
    const score = byAxis.get(axis);
    if (!score) {
      throw new ApiError(
        `score for axis '${axis}' is missing`,
        502,
        "invalid_model_output",
      );
    }
    return score;
  });
}

export function normalizeModelEvaluationPayload(raw: AttemptEvaluation) {
  const normalizedImprovementPoints = selectArrayItems(raw.improvementPoints, [
    "次回は相手に伝えるべき要点を一つ以上含めてください。",
  ]);

  if (!raw.comparison) {
    return {
      ...raw,
      goodPoints: raw.goodPoints.slice(0, 3),
      improvementPoints: normalizedImprovementPoints,
      comparison: null,
    };
  }

  return {
    ...raw,
    goodPoints: raw.goodPoints.slice(0, 3),
    improvementPoints: normalizedImprovementPoints,
    comparison: {
      ...raw.comparison,
      improvedPoints: raw.comparison.improvedPoints
        .filter((item) => item.trim().length > 0)
        .slice(0, 3),
      remainingPoints: raw.comparison.remainingPoints
        .filter((item) => item.trim().length > 0)
        .slice(0, 3),
    },
  };
}

export function buildScoreDiff(
  previousScores: PreviousEvaluationPayload["scores"],
  currentScores: EvaluationScore[],
) {
  const previousMap = new Map(
    previousScores.map((score) => [score.axis, score]),
  );
  const currentMap = new Map(currentScores.map((score) => [score.axis, score]));

  return scoreAxes.map((axis) => {
    const previous = previousMap.get(axis);
    const current = currentMap.get(axis);

    if (!previous || !current) {
      throw new ApiError(
        `score diff for axis '${axis}' is missing`,
        502,
        "invalid_model_output",
      );
    }

    return {
      axis,
      before: previous.score,
      after: current.score,
      diff: current.score - previous.score,
    };
  });
}

export function withDeterministicComparison(params: {
  raw: AttemptEvaluation;
  previousEvaluation?: PreviousEvaluationPayload;
}): AttemptEvaluation {
  if (!params.previousEvaluation) {
    return {
      ...params.raw,
      comparison: null,
    };
  }

  const scoreDiff = buildScoreDiff(
    params.previousEvaluation.scores,
    params.raw.scores,
  );

  return {
    ...params.raw,
    comparison: params.raw.comparison
      ? {
          ...params.raw.comparison,
          scoreDiff,
        }
      : {
          scoreDiff,
          improvedPoints: selectFallbackImprovedPoints(params.raw.goodPoints),
          remainingPoints: params.raw.improvementPoints.slice(0, 2),
          comparisonSummary:
            "前回より改善した点と残課題を比較できました。スコア差分を見ながら次の練習に反映してください。",
        },
  };
}

function selectFallbackImprovedPoints(goodPoints: string[]) {
  if (goodPoints.length > 0) {
    return goodPoints.slice(0, 2);
  }

  return ["今回は改善点を特定できる十分な発話がありませんでした。"];
}

function selectArrayItems(items: string[], fallback: string[]) {
  const normalized = items.filter((item) => item.trim().length > 0).slice(0, 3);
  if (normalized.length > 0) {
    return normalized;
  }

  const fallbackItems = fallback
    .filter((item) => item.trim().length > 0)
    .slice(0, 3);
  if (fallbackItems.length > 0) {
    return fallbackItems;
  }

  return ["今回は十分な比較材料がありませんでした。"];
}

export function inferApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("timeout") ||
      message.includes("deadline") ||
      message.includes("rate") ||
      message.includes("quota") ||
      message.includes("503")
    ) {
      return new ApiError(
        "評価の生成に失敗しました。少し待ってから再試行してください。",
        503,
        "upstream_retryable",
        true,
      );
    }
  }

  return new ApiError("評価の生成に失敗しました。", 500, "evaluation_failed");
}
