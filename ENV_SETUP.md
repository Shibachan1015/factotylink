# 環境変数設定ガイド

## Supabase APIキー

バックエンドでSupabaseを使用するには、以下の3つの情報が必要です。

### ✅ 既に取得済みの情報

1. **SUPABASE_URL**
   ```
   https://bqidlvbrnwxczyxoniyj.supabase.co
   ```

2. **SUPABASE_ANON_KEY**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWRsdmJybnd4Y3p5eG9uaXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyOTMwNTUsImV4cCI6MjA3OTg2OTA1NX0.vcVyceYQnWBdYnpGP5q91dHjlSUTD0xwKVzZLvcwUc4
   ```

### ⚠️ 要取得: SUPABASE_SERVICE_ROLE_KEY

これは機密情報のため、Supabase Dashboardから取得する必要があります。

#### 取得方法

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクト「Facktorylink Project」を選択
3. 左メニューから「Settings」→「API」を開く
4. 「Project API keys」セクションで「service_role」の「secret」キーをコピー
   - ⚠️ **重要**: 「anon」ではなく「service_role」キーを使用
   - ⚠️ **警告**: このキーは機密情報です。絶対に公開しないでください

## 環境変数ファイルの作成

`backend/`ディレクトリに`.env`ファイルを作成してください：

```bash
cd backend
```

`.env`ファイルの内容：

```env
# Supabase設定
SUPABASE_URL=https://bqidlvbrnwxczyxoniyj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWRsdmJybnd4Y3p5eG9uaXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyOTMwNTUsImV4cCI6MjA3OTg2OTA1NX0.vcVyceYQnWBdYnpGP5q91dHjlSUTD0xwKVzZLvcwUc4
SUPABASE_SERVICE_ROLE_KEY=ここに取得したservice_role_keyを貼り付け

# Shopify設定
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
SHOPIFY_REDIRECT_URI=http://localhost:8000/api/auth/shopify/callback

# 通知設定（オプション）
SLACK_WEBHOOK_URL=
LINE_CHANNEL_ACCESS_TOKEN=

# その他
JWT_SECRET=your_jwt_secret_key_here
PORT=8000
FRONTEND_URL=http://localhost:5173
```

## なぜService Role Keyが必要なのか？

- **Anon Key**: フロントエンド用。RLSポリシーの制約を受ける
- **Service Role Key**: バックエンド用。RLSポリシーをバイパスできる（管理者権限）

バックエンドでは管理者権限でデータベースにアクセスする必要があるため、Service Role Keyを使用します。

## セキュリティ注意事項

- ✅ `.env`ファイルは既に`.gitignore`に含まれています
- ⚠️ Service Role Keyは絶対にGitHubにコミットしないでください
- ⚠️ フロントエンドコードに含めないでください

## 確認方法

環境変数が正しく設定されているか確認：

```bash
cd backend
deno task dev
```

エラーが表示されなければ、正しく設定されています。

