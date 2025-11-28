# Supabase APIキー設定ガイド

## 必要なAPIキー

バックエンドでSupabaseを使用するには、以下の3つの情報が必要です：

### 1. SUPABASE_URL
✅ **既に取得済み**
```
https://bqidlvbrnwxczyxoniyj.supabase.co
```

### 2. SUPABASE_ANON_KEY
✅ **既に取得済み**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWRsdmJybnd4Y3p5eG9uaXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyOTMwNTUsImV4cCI6MjA3OTg2OTA1NX0.vcVyceYQnWBdYnpGP5q91dHjlSUTD0xwKVzZLvcwUc4
```

### 3. SUPABASE_SERVICE_ROLE_KEY
⚠️ **要取得** - これは機密情報のため、Supabase Dashboardから取得する必要があります。

## Service Role Keyの取得方法

### ステップ1: Supabase Dashboardにアクセス
1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクト「Facktorylink Project」を選択

### ステップ2: API設定を開く
1. 左メニューから「Settings」（⚙️）をクリック
2. 「API」または「API Keys」を選択

### ステップ3: Service Role Keyをコピー

**方法A: Project API keysセクションから取得（推奨）**
1. 「Project API keys」セクションを確認
2. 「service_role」の「secret」キーをコピー
   - ⚠️ **重要**: このキーは機密情報です。絶対に公開しないでください
   - ⚠️ **注意**: 「anon」キーではなく「service_role」キーを使用してください

**方法B: 新しいSecret Keyを作成（最新UIの場合）**
1. 「API Keys」ページで「Create new secret key」ボタンをクリック
2. 新しいsecretキーを作成（これはservice_roleと同じ権限を持ちます）
3. 作成されたキーをコピー（表示されるのは一度だけなので注意）

**方法C: 見つからない場合**
最新のSupabase UIでは、JWTベースの`service_role`キーが非表示になっている可能性があります。
この場合、以下のいずれかを試してください：
1. ページを下にスクロールして「JWT Settings」セクションを確認
2. 「Reveal」ボタンをクリックしてservice_roleキーを表示
3. または、新しい「secret」キーを作成して使用（方法B参照）

### ステップ4: 環境変数に設定
`.env`ファイルに設定します（次のセクション参照）

## 環境変数の設定

### 1. .envファイルの作成

`backend/`ディレクトリに`.env`ファイルを作成：

```bash
cd backend
cp .env.example .env
```

### 2. .envファイルを編集

取得したService Role Keyを設定：

```env
# Supabase設定
SUPABASE_URL=https://bqidlvbrnwxczyxoniyj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWRsdmJybnd4Y3p5eG9uaXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyOTMwNTUsImV4cCI6MjA3OTg2OTA1NX0.vcVyceYQnWBdYnpGP5q91dHjlSUTD0xwKVzZLvcwUc4
SUPABASE_SERVICE_ROLE_KEY=取得したservice_role_keyをここに貼り付け

# その他の設定...
```

## なぜService Role Keyが必要なのか？

### Anon Key vs Service Role Key

- **Anon Key**:
  - フロントエンドで使用
  - RLS（Row Level Security）ポリシーの制約を受ける
  - 公開しても比較的安全（RLSで保護されているため）

- **Service Role Key**:
  - バックエンドでのみ使用
  - RLSポリシーをバイパスできる
  - **機密情報** - 絶対に公開しないこと
  - データベースの全操作が可能

### このプロジェクトでの使用

バックエンドでは`SUPABASE_SERVICE_ROLE_KEY`を使用しています：
- 管理者権限でのデータ操作
- RLSポリシーをバイパスした操作
- 全テーブルへのアクセス

## セキュリティ注意事項

1. **Service Role Keyは絶対に公開しない**
   - GitHubにコミットしない
   - フロントエンドコードに含めない
   - 公開リポジトリにアップロードしない

2. **.envファイルは.gitignoreに含まれている**
   - 既に`.gitignore`に`.env`が追加されています

3. **本番環境では環境変数管理サービスを使用**
   - Deno Deploy: 環境変数設定画面で設定
   - Vercel: 環境変数設定画面で設定
   - その他のホスティングサービスも同様

## 確認方法

環境変数が正しく設定されているか確認：

```bash
cd backend
deno task dev
```

エラーが表示されなければ、正しく設定されています。

エラー例：
```
Error: Supabase環境変数が設定されていません
```

このエラーが出る場合は、`.env`ファイルが正しく作成され、環境変数が設定されているか確認してください。

supabase factorylink pass wJ7l3BC4s80ksRFa
