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

### 1. 環境変数の設定

**重要**: SupabaseのAPIキーが必要です。詳細は `ENV_SETUP.md` を参照してください。

`backend/`ディレクトリに`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase（既に取得済みの情報）
SUPABASE_URL=https://bqidlvbrnwxczyxoniyj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWRsdmJybnd4Y3p5eG9uaXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyOTMwNTUsImV4cCI6MjA3OTg2OTA1NX0.vcVyceYQnWBdYnpGP5q91dHjlSUTD0xwKVzZLvcwUc4

# ⚠️ 要取得: Supabase Dashboardから取得してください
# Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Shopify
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
SHOPIFY_REDIRECT_URI=http://localhost:8000/api/auth/shopify/callback

# 通知（オプション）
SLACK_WEBHOOK_URL=
LINE_CHANNEL_ACCESS_TOKEN=

# その他
JWT_SECRET=your_jwt_secret_key
PORT=8000
FRONTEND_URL=http://localhost:5173
```

**Service Role Keyの取得方法**:
1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクト「Facktorylink Project」を選択
3. Settings → API → service_role key をコピー

### 2. データベーススキーマの適用

#### 方法1: Supabase Dashboardを使用（推奨）

1. Supabase Dashboardにログイン
2. SQL Editorを開く
3. 以下のファイルの内容をコピーして実行:
   - `backend/src/utils/database-schema.sql`
   - `backend/src/utils/rls-policies.sql`

#### 方法2: Supabase CLIを使用

```bash
# Supabase CLIをインストール（未インストールの場合）
# macOS: brew install supabase/tap/supabase
# その他: https://supabase.com/docs/guides/cli

cd backend
supabase link --project-ref your-project-ref
supabase db push
```

#### 方法3: スクリプトを使用

```bash
cd backend
deno run --allow-all src/utils/apply-schema.ts
```

### 3. バックエンドの起動

```bash
cd backend
deno task dev
```

バックエンドは `http://localhost:8000` で起動します。

### 4. フロントエンドの起動

```bash
cd frontend
npm install
npm run dev
```

フロントエンドは `http://localhost:5173` で起動します。

## 開発

### バックエンド開発

```bash
cd backend
deno task dev  # 開発モード（ホットリロード）
deno task start  # 本番モード
deno task check  # 型チェックとリント
```

### フロントエンド開発

```bash
cd frontend
npm run dev  # 開発モード
npm run build  # ビルド
npm run preview  # ビルド結果のプレビュー
```

## APIエンドポイント

### 認証
- `GET /api/auth/shopify/authorize` - Shopify OAuth開始
- `GET /api/auth/shopify/callback` - Shopify OAuthコールバック
- `POST /api/auth/customer/login` - 得意先ログイン
- `POST /api/auth/customer/change-password` - パスワード変更

### 商品
- `GET /api/products` - 商品一覧（得意先用）
- `GET /api/products/:id` - 商品詳細
- `POST /api/products/sync` - 商品データ同期（管理者用）

### 注文
- `POST /api/orders` - 注文作成（得意先用）
- `GET /api/orders` - 注文一覧（得意先用）
- `GET /api/orders/:id` - 注文詳細（得意先用）
- `GET /api/admin/orders` - 注文一覧（管理者用）
- `GET /api/admin/orders/:id` - 注文詳細（管理者用）
- `PATCH /api/admin/orders/:id/status` - ステータス変更

### 帳票
- `POST /api/documents/delivery-note/:orderId` - 納品書生成
- `POST /api/documents/invoice/:orderId` - 請求書生成
- `POST /api/documents/label/:orderId` - ラベル生成

### 得意先管理
- `GET /api/admin/customers` - 得意先一覧
- `GET /api/admin/customers/:id` - 得意先詳細
- `POST /api/admin/customers` - 得意先作成
- `PATCH /api/admin/customers/:id` - 得意先更新
- `DELETE /api/admin/customers/:id` - 得意先削除

### 在庫管理
- `GET /api/admin/inventory` - 商品在庫一覧
- `PUT /api/admin/inventory` - 在庫数更新

### 材料在庫管理
- `GET /api/admin/materials` - 材料一覧
- `POST /api/admin/materials` - 材料作成
- `PATCH /api/admin/materials/:id` - 材料更新
- `DELETE /api/admin/materials/:id` - 材料削除
- `GET /api/admin/materials/transactions` - 入出庫履歴
- `POST /api/admin/materials/transactions/in` - 入庫登録
- `POST /api/admin/materials/transactions/out` - 出庫登録

詳細は `docs/AGENT.md` を参照してください。
