# Service Role Keyが見つからない場合の対処法

## 問題
Supabase Dashboardの「Settings → API」ページで`service_role`キーが見つからない。

## 原因
最新のSupabase UIでは、セキュリティ上の理由から`service_role`キーが非表示になっている場合があります。

## 解決方法

### 方法1: JWT Settingsセクションを確認
1. Supabase Dashboardで「Settings → API」を開く
2. ページを下にスクロール
3. 「JWT Settings」セクションを探す
4. 「Reveal」または「Show」ボタンをクリック
5. `service_role`キーが表示されます

### 方法2: 新しいSecret Keyを作成（推奨）
最新のSupabaseでは、新しい「secret」キーシステムが推奨されています：

1. 「Settings → API Keys」を開く
2. 「Create new secret key」ボタンをクリック
3. キー名を入力（例: "Backend Service Key"）
4. 作成されたキーをコピー
   - ⚠️ **重要**: このキーは一度だけ表示されます。必ずコピーしてください
5. このキーを`SUPABASE_SERVICE_ROLE_KEY`として使用

### 方法3: 直接URLでアクセス
以下のURLに直接アクセスしてみてください：
```
https://app.supabase.com/project/bqidlvbrnwxczyxoniyj/settings/api
```

### 方法4: ブラウザの検索機能を使用
1. 「Settings → API」ページを開く
2. ブラウザの検索機能（Cmd+F / Ctrl+F）を使用
3. 「service_role」と検索
4. 見つかった場合は、その周辺を確認

## 確認方法

キーが正しく設定されているか確認：

```bash
cd backend
cat .env | grep SUPABASE_SERVICE_ROLE_KEY
```

正しく設定されていれば、長い文字列が表示されます（JWT形式）。

## 注意事項

- `service_role`キーは**絶対に公開しないでください**
- GitHubにコミットしないでください
- フロントエンドコードに含めないでください
- `.env`ファイルは既に`.gitignore`に含まれています

## それでも見つからない場合

1. Supabaseのサポートに問い合わせる
2. または、プロジェクトのJWT secretをローテートして新しいキーを生成する
   - 「Settings → API → JWT Settings」で「Rotate JWT secret」を実行
   - ⚠️ **注意**: これにより既存のキーが無効になります

