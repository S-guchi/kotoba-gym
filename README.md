# kotoba-gym

## Server local development

`apps/server` は Cloudflare Workers の標準どおり `apps/server/.dev.vars` からローカル秘密値を読み込みます。

1. `cp apps/server/.dev.vars.example apps/server/.dev.vars`
2. `apps/server/.dev.vars` に `GEMINI_API_KEY` を設定
3. `pnpm dev:server`

`GEMINI_MODEL` は `apps/server/wrangler.jsonc` の `vars` に既定値があり、必要なら `apps/server/.dev.vars` 側でローカル上書きできます。
