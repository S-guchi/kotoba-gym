import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  type ServerConfig,
  type WorkerBindings,
  loadConfig,
} from "./config.js";
import {
  type AppRepository,
  D1AppRepository,
} from "./repositories/app-repository.js";
import { registerV1Routes } from "./v1/routes.js";

export function createApp(deps?: {
  config?: ServerConfig;
  repository?: AppRepository;
}) {
  const app = new Hono<{
    Bindings: WorkerBindings;
    Variables: {
      config: ServerConfig;
      repository: AppRepository;
    };
  }>();

  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  app.use("*", async (c, next) => {
    c.set("config", deps?.config ?? loadConfig(c.env));
    c.set("repository", deps?.repository ?? new D1AppRepository(c.env.DB));
    await next();
  });

  app.get("/health", (c) => c.json({ ok: true }));
  registerV1Routes(app);

  return app;
}
