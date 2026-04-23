import type { Hono } from "hono";
import type { ServerConfig, WorkerBindings } from "../config.js";
import {
  setSessionEvaluation,
  toPreviousEvaluationPayload,
} from "../lib/session-record.js";
import type { AppRepository } from "../repositories/app-repository.js";
import { ApiError, evaluateAttempt } from "./evaluation.js";
import {
  assertSupportedAudioMimeType,
  jsonApiError,
  parseCreateThemePayload,
  parseEvaluationFields,
  parseOwnerKey,
  parseSessionCreatePayload,
  resolveAudioMimeType,
  toRouteApiError,
} from "./route-helpers.js";
import { generateTheme } from "./themes.js";

type AppType = Hono<{
  Bindings: WorkerBindings;
  Variables: {
    config: ServerConfig;
    repository: AppRepository;
  };
}>;

export function registerV1Routes(app: AppType) {
  app.get("/v1/themes", async (c) => {
    try {
      const ownerKey = parseOwnerKey(c.req.query("ownerKey"));
      const themes = await c.get("repository").listThemes(ownerKey);
      return c.json({ themes });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.post("/v1/themes", async (c) => {
    try {
      const payload = parseCreateThemePayload(await c.req.json());
      const repository = c.get("repository");
      const config = c.get("config");

      const theme = await generateTheme({
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        input: payload.input,
      });

      const saved = await repository.saveTheme({
        ownerKey: payload.ownerKey,
        theme,
      });

      return c.json({ theme: saved });
    } catch (error) {
      return jsonApiError(
        toRouteApiError(error, {
          message: "テーマの生成に失敗しました。",
          code: "theme_generation_failed",
        }),
      );
    }
  });

  app.get("/v1/themes/:themeId", async (c) => {
    try {
      const ownerKey = parseOwnerKey(c.req.query("ownerKey"));
      const theme = await c.get("repository").getTheme({
        ownerKey,
        themeId: c.req.param("themeId"),
      });

      if (!theme) {
        throw new ApiError("テーマが見つかりません。", 404, "theme_not_found");
      }

      return c.json({ theme });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.post("/v1/sessions", async (c) => {
    try {
      const payload = parseSessionCreatePayload(await c.req.json());
      const repository = c.get("repository");
      const theme = await repository.getTheme({
        ownerKey: payload.ownerKey,
        themeId: payload.themeId,
      });

      if (!theme) {
        throw new ApiError("テーマが見つかりません。", 404, "theme_not_found");
      }

      const session = await repository.createSession({
        ownerKey: payload.ownerKey,
        theme,
      });

      return c.json({ session });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.get("/v1/sessions", async (c) => {
    try {
      const ownerKey = parseOwnerKey(c.req.query("ownerKey"));
      const themeId = c.req.query("themeId")?.trim() || undefined;
      const sessions = await c.get("repository").listSessions({
        ownerKey,
        themeId,
      });
      return c.json({ sessions });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.get("/v1/sessions/:sessionId", async (c) => {
    try {
      const ownerKey = parseOwnerKey(c.req.query("ownerKey"));
      const session = await c.get("repository").getSession({
        ownerKey,
        sessionId: c.req.param("sessionId"),
      });

      if (!session) {
        throw new ApiError(
          "セッションが見つかりません。",
          404,
          "session_not_found",
        );
      }

      return c.json({ session });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });

  app.post("/v1/evaluations", async (c) => {
    try {
      const repository = c.get("repository");
      const config = c.get("config");
      const form = await c.req.formData();
      const parsedFields = parseEvaluationFields(form);
      const audio = form.get("audio");

      if (!(audio instanceof File)) {
        throw new ApiError("音声ファイルが必要です。", 400, "audio_required");
      }

      const session = await repository.getSession({
        ownerKey: parsedFields.ownerKey,
        sessionId: parsedFields.sessionId,
      });

      if (!session) {
        throw new ApiError(
          "セッションが見つかりません。",
          404,
          "session_not_found",
        );
      }

      if (session.theme.id !== parsedFields.themeId) {
        throw new ApiError("テーマが一致しません。", 400, "theme_mismatch");
      }

      if (session.evaluation) {
        throw new ApiError(
          "このセッションの評価は完了しています。",
          400,
          "session_already_evaluated",
        );
      }

      const mimeType = assertSupportedAudioMimeType(
        resolveAudioMimeType(audio),
      );
      console.log("[server][evaluation] received-audio", {
        themeId: parsedFields.themeId,
        sessionId: parsedFields.sessionId,
        fileName: audio.name,
        fileType: audio.type,
        inferredMimeType: mimeType,
        fileSize: audio.size,
      });

      const previousSession = (
        await repository.listSessions({
          ownerKey: parsedFields.ownerKey,
          themeId: parsedFields.themeId,
        })
      ).find(
        (candidate) =>
          candidate.id !== session.id && candidate.evaluation !== null,
      );

      const evaluation = await evaluateAttempt({
        config,
        theme: session.theme,
        audio: new Uint8Array(await audio.arrayBuffer()),
        mimeType,
        locale: parsedFields.locale,
        previousEvaluationSummary: previousSession?.evaluation?.summary,
        previousEvaluation: previousSession?.evaluation
          ? toPreviousEvaluationPayload(previousSession.evaluation)
          : undefined,
      });

      const now = new Date().toISOString();
      const updatedSession = setSessionEvaluation({
        record: session,
        evaluation,
        recordedAt: now,
        updatedAt: now,
      });

      await repository.saveSession({
        ownerKey: parsedFields.ownerKey,
        session: updatedSession,
      });

      return c.json({
        evaluation,
        session: updatedSession,
      });
    } catch (error) {
      return jsonApiError(toRouteApiError(error));
    }
  });
}
