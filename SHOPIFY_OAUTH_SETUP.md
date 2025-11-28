# Shopify OAuth セットアップガイド

## エラー: "OAuth 認証リクエストが存在しません" について

このエラーは、Shopify OAuthの設定に問題がある場合に発生します。以下の点を確認してください。

## 確認事項

### 1. Shopify Appの設定

1. [Shopify Partners Dashboard](https://partners.shopify.com)にログイン
2. アプリを選択
3. 「App setup」タブを開く
4. 以下の設定を確認:

#### Allowed redirection URL(s)
```
http://localhost:8000/api/auth/shopify/callback
https://your-domain.com/api/auth/shopify/callback
```

**重要**: リダイレクトURIは完全一致する必要があります。末尾のスラッシュやパラメータの違いでもエラーになります。

### 2. 環境変数の設定

`.env`ファイルに以下が正しく設定されているか確認:

```env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_REDIRECT_URI=http://localhost:8000/api/auth/shopify/callback
```

### 3. OAuthフローの確認

#### ステップ1: 認証開始
```
GET /api/auth/shopify/authorize?shop=your-shop.myshopify.com
```

#### ステップ2: Shopify認証画面
Shopifyが認証画面を表示します。

#### ステップ3: コールバック
```
GET /api/auth/shopify/callback?code=xxx&shop=xxx&hmac=xxx
```

### 4. よくある問題と解決方法

#### 問題1: リダイレクトURIが一致しない

**症状**: "OAuth 認証リクエストが存在しません"

**解決方法**:
- Shopify Partners Dashboardの「Allowed redirection URL(s)」と環境変数`SHOPIFY_REDIRECT_URI`が完全一致しているか確認
- プロトコル（http/https）も一致させる
- ポート番号も一致させる

#### 問題2: API Key/Secretが間違っている

**症状**: トークン取得に失敗

**解決方法**:
- Shopify Partners DashboardでAPI KeyとSecretを再確認
- 環境変数が正しく設定されているか確認

#### 問題3: ショップドメインが間違っている

**症状**: 認証画面が表示されない

**解決方法**:
- ショップドメインは `your-shop.myshopify.com` 形式である必要があります
- `.myshopify.com` で終わる必要があります

### 5. デバッグ方法

#### バックエンドログを確認

```bash
cd backend
deno task dev
```

認証フロー中にエラーメッセージが表示されます。

#### ブラウザの開発者ツール

1. ネットワークタブを開く
2. OAuth認証のリクエストを確認
3. リダイレクトURIとパラメータを確認

### 6. テスト手順

1. バックエンドサーバーを起動:
   ```bash
   cd backend
   deno task dev
   ```

2. ブラウザで以下にアクセス:
   ```
   http://localhost:8000/api/auth/shopify/authorize?shop=your-shop.myshopify.com
   ```

3. Shopify認証画面が表示されることを確認

4. 認証を完了すると、コールバックURLにリダイレクトされます

### 7. 本番環境での注意事項

- HTTPSを使用する必要があります
- リダイレクトURIは本番ドメインに設定してください
- HMAC検証を実装してください（現在は開発環境用の簡易実装）

## トラブルシューティング

まだ問題が解決しない場合:

1. Shopify Partners Dashboardでアプリの設定を再確認
2. 環境変数が正しく読み込まれているか確認
3. バックエンドサーバーのログを確認
4. Shopifyのドキュメントを参照: https://shopify.dev/docs/apps/auth/oauth

