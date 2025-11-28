# Supabase APIキーの見つけ方（最新UI対応）

## 現在の状況
あなたは現在「Project Settings → General」ページにいます。
APIキーは「Settings → API」または「Settings → API Keys」ページにあります。

## 手順

### ステップ1: Settingsセクションを探す
左サイドバーで「Settings」（⚙️ アイコン）を探してください。
- 「Project Settings」とは**別のセクション**です
- 通常、サイドバーの下部にあります

### ステップ2: APIページを開く
1. 「Settings」をクリック
2. サブメニューから「API」または「API Keys」を選択

### ステップ3: Service Role Keyをコピー
「Project API keys」セクションで：
- 「service_role」キーを探す
- 「Reveal」ボタンをクリックして表示
- キーをコピー

## 直接URLでアクセス
以下のURLをブラウザのアドレスバーに入力：

```
https://app.supabase.com/project/bqidlvbrnwxczyxoniyj/settings/api
```

または

```
https://app.supabase.com/project/bqidlvbrnwxczyxoniyj/settings/api-keys
```

## それでも見つからない場合

### 方法1: 新しいSecret Keyを作成
1. 「Settings → API Keys」を開く
2. 「Create new secret key」ボタンをクリック
3. キー名を入力（例: "Backend Service Key"）
4. 作成されたキーをコピー（一度だけ表示されます）
5. このキーを`SUPABASE_SERVICE_ROLE_KEY`として使用

### 方法2: ブラウザの検索機能を使用
1. 現在のページで Cmd+F（Mac）または Ctrl+F（Windows）を押す
2. 「service_role」と検索
3. 見つかった場合は、その周辺を確認

## 確認
キーが見つかったら、`.env`ファイルに設定：

```env
SUPABASE_SERVICE_ROLE_KEY=見つけたキーをここに貼り付け
```

