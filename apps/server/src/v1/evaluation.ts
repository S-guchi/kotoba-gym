import { Type } from "@google/genai";
import {
  AttemptEvaluationSchema,
  type EvaluationScore,
  getPracticePromptById,
  type PreviousAttemptPayload,
  scoreAxes,
} from "@kotoba-gym/core";
import { createLLMClient } from "@kotoba-gym/core";

const EVALUATION_RESPONSE_SCHEMA = {
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

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}

function buildEvaluationPrompt(params: {
  promptId: string;
  attemptNumber: number;
  locale: string;
  previousAttemptSummary?: string;
  previousEvaluation?: PreviousAttemptPayload;
}): string {
  const prompt = getPracticePromptById(params.promptId);
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

  return `あなたはエンジニア向け口頭説明トレーニングの評価者です。添付された音声を聞いて、回答を日本語で評価してください。

## 回答言語
${params.locale}

## お題カテゴリ
${prompt.category}

## お題タイトル
${prompt.title}

## お題本文
${prompt.prompt}

## 想定状況
${prompt.situation}

## この回答で確認したいこと
${prompt.goals.map((item) => `- ${item}`).join("\n")}

## 評価軸
- conclusion: 結論が先に出ているか
- structure: 話の順番やまとまりが分かりやすいか
- specificity: 具体例、数字、固有名詞があるか
- technicalValidity: 技術的な説明や判断が妥当か
- brevity: 無駄が少なく簡潔か

${previousSection}

## 出力ルール
1. transcript は音声の自然な文字起こしにしてください。
2. summary は一言総評として2文以内でまとめてください。
3. scores は5軸すべてを必ず含めてください。score は1から5です。
4. goodPoints は2個から3個、improvementPoints は2個から3個にしてください。
5. exampleAnswer は次回の参考になる短い改善例を1つ返してください。
6. nextFocus は次回の意識点を1文で返してください。
7. 前回結果がある場合だけ comparison を埋めてください。scoreDiff は全軸を含め、improvedPoints と remainingPoints は各1個から3個にしてください。
8. 前回結果がない場合は comparison を null にしてください。
9. 抽象論ではなく、このお題と今回の発話内容に即して評価してください。`;
}

function normalizeScores(scores: EvaluationScore[]): EvaluationScore[] {
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

function buildScoreDiff(
  previousScores: PreviousAttemptPayload["scores"],
  currentScores: EvaluationScore[],
) {
  const previousMap = new Map(previousScores.map((score) => [score.axis, score]));

  return scoreAxes.map((axis) => {
    const previous = previousMap.get(axis);
    const current = currentScores.find((score) => score.axis === axis);

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

function withDeterministicComparison(params: {
  raw: ReturnType<typeof AttemptEvaluationSchema.parse>;
  previousEvaluation?: PreviousAttemptPayload;
}) {
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

function inferApiError(error: unknown): ApiError {
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

  return new ApiError(
    "評価の生成に失敗しました。",
    500,
    "evaluation_failed",
  );
}

export async function evaluateAttempt(params: {
  apiKey: string;
  model: string;
  promptId: string;
  attemptNumber: number;
  audio: Buffer;
  mimeType: string;
  locale: string;
  previousAttemptSummary?: string;
  previousEvaluation?: PreviousAttemptPayload;
}) {
  try {
    const client = createLLMClient(params.apiKey, params.model);
    const raw = await client.generateParts(
      [
        {
          text: buildEvaluationPrompt({
            promptId: params.promptId,
            attemptNumber: params.attemptNumber,
            locale: params.locale,
            previousAttemptSummary: params.previousAttemptSummary,
            previousEvaluation: params.previousEvaluation,
          }),
        },
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.audio.toString("base64"),
          },
        },
      ],
      {
        responseSchema: EVALUATION_RESPONSE_SCHEMA,
        temperature: 0.4,
        thinkingLevel: "low",
      },
    );

    const parsed = AttemptEvaluationSchema.parse(JSON.parse(raw));
    const normalized = {
      ...parsed,
      scores: normalizeScores(parsed.scores),
    };

    return withDeterministicComparison({
      raw: normalized,
      previousEvaluation: params.previousEvaluation,
    });
  } catch (error) {
    throw inferApiError(error);
  }
}
