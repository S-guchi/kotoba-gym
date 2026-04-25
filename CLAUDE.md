# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

kotoba-gym は「報連相（ほうれんそう）」スピーチ練習アプリ。ユーザーが生の入力テキストから素材整理→結論候補→話す順序→スクリプト生成→リハーサル→フィードバックという一連のステップを踏む。AI 処理には Gemini API を使用。

## Monorepo Structure

pnpm workspace モノレポ。3 パッケージ構成:

- **`packages/core`** — Zod スキーマと型定義。API リクエスト/レスポンスの contract を一元管理。`@kotoba-gym/core` として他パッケージから import
- **`apps/server`** — Hono + Cloudflare Workers API サーバー。D1 データベース使用。Gemini API でテキスト整理・結論生成・スピーチプラン・スクリプト生成・フィードバック等の AI 処理を行う
- **`apps/mobile`** — Expo (SDK 54) + Expo Router モバイルアプリ

### パッケージ間の依存ルール

- `apps/mobile` と `apps/server` は `@kotoba-gym/core` 経由で共有型を import
- `apps/mobile` から `packages/core/src/*` を直接 import しない
- mobile は `packages/core/package.json` の `react-native` entry を使う

## Commands

```bash
pnpm dev:mobile          # Expo 開発サーバー
pnpm dev:server          # Hono API (wrangler dev, port 8787)
pnpm build               # core → server の順にビルド
pnpm typecheck           # 全パッケージの型チェック
pnpm test                # Vitest 実行（全パッケージ対象）
pnpm lint                # 全パッケージ + ルート設定の lint
pnpm format              # Biome で整形

# DB 操作（ローカル D1）
pnpm db:local:migrate    # マイグレーション適用
pnpm db:local:reset      # 全テーブル削除
pnpm db:local:fresh      # reset + migrate

# 個別パッケージの操作例
pnpm -C apps/server typecheck
pnpm -C packages/core lint
```

## Server Local Development

`apps/server/.dev.vars` に `GEMINI_API_KEY` を設定（`.dev.vars.example` をコピー）。`GEMINI_MODEL` は `wrangler.jsonc` の `vars` に既定値あり。

## Architecture Notes

- **API エンドポイント** (`apps/server/src/app.ts`): `createApp()` ファクトリで DI 対応。`generator`・`repository` を差し替え可能にしてテストしやすくしている
- **Gemini クライアント** (`apps/server/src/gemini-client.ts`): `JsonGenerator` インターフェースで LLM 呼び出しを抽象化
- **プロンプト** (`apps/server/src/prompts.ts`): 各 AI 機能のプロンプトビルダー
- **リポジトリ** (`apps/server/src/repository.ts`): `SessionRepository` インターフェース + `D1SessionRepository` 実装
- **スキーマ** (`packages/core/src/index.ts`): 全 Zod スキーマを一箇所で定義、API 境界のバリデーションに使用

## Development Style

- TDD（探索 → Red → Green → Refactor）で進める
- テストは **Vitest** 統一、`test.each` / `describe.each` によるパラメーターテストを使う
- pure function に切り出してからテストする方針
- フォーマット・import 整理は Biome に従う（2 スペースインデント）
- コミットメッセージは短い日本語要約
- 変更後は `pnpm test && pnpm lint && pnpm format` を実行
