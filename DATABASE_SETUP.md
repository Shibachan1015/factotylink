# データベースセットアップガイド

このガイドでは、Supabaseデータベースのセットアップ方法を説明します。

## 前提条件

- Supabaseアカウントとプロジェクトが作成されていること
- 環境変数 `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` が設定されていること

## 方法1: Supabase Dashboardを使用（推奨）

最も簡単な方法です。

### 手順

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」をクリック
4. 「New query」をクリック
5. 以下のSQLファイルの内容をコピーして貼り付け:
   - `backend/src/utils/database-schema.sql`
   - `backend/src/utils/rls-policies.sql`
6. 「Run」ボタンをクリックして実行

### 確認

SQL Editorで以下のクエリを実行して、テーブルが作成されたことを確認:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

以下のテーブルが表示されれば成功です:
- shops
- customers
- products
- orders
- order_items
- materials
- material_transactions
- documents

## 方法2: Supabase CLIを使用

### インストール

```bash
# macOS
brew install supabase/tap/supabase

# その他
# https://supabase.com/docs/guides/cli を参照
```

### セットアップ

```bash
# Supabaseプロジェクトにログイン
supabase login

# プロジェクトをリンク
cd backend
supabase link --project-ref your-project-ref

# スキーマを適用
supabase db push
```

## 方法3: PostgreSQL接続を使用

### 接続情報の取得

1. Supabase Dashboardでプロジェクトを開く
2. 「Settings」→「Database」を開く
3. 「Connection string」の「URI」をコピー

### psqlを使用

```bash
# 接続
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# SQLファイルを実行
\i backend/src/utils/database-schema.sql
\i backend/src/utils/rls-policies.sql
```

### その他のツール

- pgAdmin
- DBeaver
- TablePlus
- その他のPostgreSQLクライアント

## トラブルシューティング

### エラー: "relation already exists"

テーブルが既に存在する場合、以下のいずれかを実行:

1. 既存のテーブルを削除して再作成
2. `CREATE TABLE IF NOT EXISTS` を使用（既に使用済み）

### エラー: "permission denied"

`SUPABASE_SERVICE_ROLE_KEY` を使用していることを確認してください。
`SUPABASE_ANON_KEY` ではスキーマ作成はできません。

### エラー: "connection refused"

- Supabaseプロジェクトがアクティブであることを確認
- ファイアウォール設定を確認
- 接続文字列が正しいことを確認

## 次のステップ

データベースセットアップが完了したら:

1. 環境変数を設定（`.env`ファイル）
2. バックエンドサーバーを起動: `cd backend && deno task dev`
3. フロントエンドを起動: `cd frontend && pnpm install && pnpm run dev`

## 参考資料

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

