# Repository Guidelines

## Project Structure & Module Organization
このリポジトリは `pnpm` workspace のモノレポです。主要コードは `apps/` と `packages/` にあります。

- `apps/mobile`: Expo / Expo Router ベースのモバイルアプリ
- `apps/server`: Hono API サーバー
- `packages/core`: 共有スキーマ、型、お題定義
- `docs/`: 現行MVPの方針メモ

新規実装は、可能な限り `apps/mobile`, `apps/server`, `packages/core` に寄せてください。

## Build, Test, and Development Commands
ルートで実行します。

- `pnpm dev:mobile`: Expo 開発サーバーを起動
- `pnpm dev:server`: Hono API を起動
- `pnpm build`: `packages/core` と `apps/server` をビルド
- `pnpm typecheck`: 現行 3 モジュールの型チェック
- `pnpm test`: Vitest を実行
- `pnpm lint`: 現行 3 モジュールとルート設定の lint
- `pnpm format`: Biome で整形

個別確認は例として `pnpm -C apps/server typecheck`, `pnpm exec tsc --noEmit` in `apps/mobile` を使います。

## Coding Style & Naming Conventions
TypeScript を前提に、インデントは 2 スペースです。フォーマットと import 整理は `Biome` に従ってください。  
React コンポーネントは `PascalCase`、関数・変数は `camelCase`、ルートや画面ファイルは Expo Router の慣例に合わせます。  
コメントは必要最小限にし、複雑な意図だけを日本語で補足してください。

## Testing Guidelines
テストは **Vitest** に統一します。新規テストは必ず `test.each` または `describe.each` を使ったパラメーターテストで記述してください。  
UI 全体の画面テストは今回の主対象ではなく、pure function に切り出せるロジックを優先してテストします。  
変更後は最低限 `pnpm test`, `pnpm lint`, `pnpm format` を必須実行してください。失敗した場合は、結果と未解決理由を明記してください。必要に応じて `pnpm typecheck` も合わせて実行します。

## Commit & Pull Request Guidelines
コミットメッセージは履歴どおり短い日本語要約が基本です。例: `MVP`, `env`, `音声入力できるところまで`。  
PR では以下を必ず書いてください。

- 何を変えたか
- どこを確認したか (`pnpm typecheck` など)
- UI 変更がある場合はスクリーンショット
- 既知の未対応や次の作業

## Security & Configuration Tips
秘密情報はコミットしないでください。環境変数は `.env` を参照し、公開向け値は `EXPO_PUBLIC_` 接頭辞のみに限定します。
