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


`backend/`ディレクトリに`.env`ファイルを作成し、以下の環境変数を設定してください：




#### Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

#### Shopify
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
# pnpmをインストール（未インストールの場合）
# macOS: brew install pnpm
# その他: npm install -g pnpm または curl -fsSL https://get.pnpm.io/install.sh | sh -

cd frontend
pnpm install
pnpm run dev
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
pnpm install  # 初回のみ
pnpm run dev  # 開発モード
pnpm run build  # ビルド
pnpm run preview  # ビルド結果のプレビュー
```

## 実装済み機能

### 得意先ポータル
- ✅ ログイン・ログアウト
- ✅ 商品一覧表示・検索
- ✅ 商品詳細表示
- ✅ カート機能（追加・削除・数量変更）
- ✅ 注文確定
- ✅ 注文履歴一覧・詳細・ステータス確認

### 管理者機能
- ✅ 注文一覧・詳細表示
- ✅ ステータス変更（新規→製造中→製造完了→出荷済み）
- ✅ 検索・フィルター（得意先別、日付別、ステータス別）
- ✅ 製造完了時のShopify在庫+処理
- ✅ 出荷時のShopify在庫-処理
- ✅ 納品書PDF生成
- ✅ 請求書PDF生成
- ✅ ラベルPDF生成（A4用紙22面シール）
- ✅ 得意先一覧・登録・編集・削除
- ✅ 請求方式設定（都度/掛売）
- ✅ ログインアカウント発行
- ✅ Shopify商品一覧表示
- ✅ 在庫数表示・編集機能
- ✅ 材料マスタ登録・編集・削除
- ✅ 入庫登録・出庫登録
- ✅ 現在在庫表示
- ✅ 入出庫履歴一覧
- ✅ ダッシュボード（統計表示）

### 通知連携
- ✅ 新規注文時 → Slack/LINE通知
- ✅ ステータス変更時 → 得意先に通知（LINE）

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
