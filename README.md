# BtoB受発注プラットフォーム

製造業向けBtoB受発注システム。得意先がオンラインで注文し、製造側が進捗管理から納品書発行までを一元管理する。

## 技術スタック

### バックエンド
- ランタイム: Deno
- フレームワーク: Hono
- バリデーション: Zod
- データベース: Supabase (PostgreSQL)

### フロントエンド
- フレームワーク: React + Vite
- UIライブラリ: Shopify Polaris
- 状態管理: Zustand
- フォーム: React Hook Form + Zod

## セットアップ

### バックエンド

```bash
cd backend
deno task dev
```

### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

## 環境変数

`.env`ファイルを作成し、以下の環境変数を設定してください：

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SHOP_DOMAIN=
JWT_SECRET=
PORT=8000
FRONTEND_URL=http://localhost:5173
```

詳細は `docs/AGENT.md` を参照してください。
