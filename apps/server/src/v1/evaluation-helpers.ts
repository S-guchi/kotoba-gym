import { Type } from "@google/genai";
import {
  type AttemptEvaluation,
  type EvaluationScore,
  type PracticePrompt,
  type PreviousAttemptPayload,
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
  prompt: PracticePrompt;
  attemptNumber: number;
  locale: string;
  previousAttemptSummary?: string;
  previousEvaluation?: PreviousAttemptPayload;
}): string {
  const backgroundSection = params.prompt.background
    ? `\n## 背景\n${params.prompt.background}\n`
    : "";
  const previousSection = params.previousEvaluation
    ? `
## 前回の回答結果
- attemptNumber: ${params.previousEvaluation.attemptNumber}
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
${params.previousAttemptSummary ? `- previousAttemptSummary: ${params.previousAttemptSummary}` : ""}`
    : "\n## 前回の回答結果\n今回は初回回答です。comparison は null を返してください。";

  return `あなたはエンジニア向け口頭コミュニケーション練習コーチです。添付された音声を聞いて、回答を日本語で評価してください。

## 回答言語
${params.locale}

## お題カテゴリ
${params.prompt.category}

## お題タイトル
${params.prompt.title}

## お題本文
${params.prompt.prompt}
${backgroundSection}

## 想定状況
${params.prompt.situation}

## この回答で確認したいこと
${params.prompt.goals.map((item) => `- ${item}`).join("\n")}

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
8. goodPoints は2個から3個、improvementPoints は2個から3個にしてください。十分な内容がない場合は、「結論がまだ出ていない」「具体例が不足している」のように不足自体を指摘してください。
9. exampleAnswer は次回の参考になる短い改善例を1つ返してください。ただし今回の transcript に存在しない過去エピソードを事実として断定してはいけません。
10. nextFocus は次回の意識点を1文で返してください。
11. 前回結果がある場合だけ comparison を埋めてください。scoreDiff は全軸を含め、improvedPoints と remainingPoints は各1個から3個にしてください。
12. 前回結果がない場合は comparison を null にしてください。
13. 抽象論ではなく、このお題と今回の発話内容に即して評価してください。

## 最重要
- 音声から確認できない内容を「それっぽい技術文脈」で埋めないこと。
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

export function buildScoreDiff(
  previousScores: PreviousAttemptPayload["scores"],
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
  previousEvaluation?: PreviousAttemptPayload;
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
          improvedPoints: params.raw.goodPoints.slice(0, 2),
          remainingPoints: params.raw.improvementPoints.slice(0, 2),
          comparisonSummary:
            "前回より改善した点と残課題を比較できました。スコア差分を見ながら次の回答に反映してください。",
        },
  };
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
