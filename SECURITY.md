# セキュリティガイド

## パッケージマネージャーについて

### pnpmの使用

このプロジェクトでは、セキュリティ上の理由から**pnpm**を使用しています。

#### npmのリスク
- npmパッケージのサプライチェーン攻撃のリスク
- ランサムウェアやマルウェアが混入する可能性
- 依存関係の脆弱性

#### pnpmの利点
- より厳格な依存関係解決
- ディスク容量の節約（シンボリックリンク使用）
- より安全なパッケージインストール
- スクリプト実行の制御が容易

### インストール方法

```bash
# macOS
brew install pnpm

# その他
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 使用方法

```bash
cd frontend
pnpm install    # 依存関係のインストール
pnpm run dev    # 開発サーバー起動
pnpm run build  # ビルド
```

## Viteについて

### セキュリティ評価

**Viteは安全です**。以下の理由から信頼できます：

1. **公式プロジェクト**: Evan You（Vue.jsの作者）が開発
2. **広く使用**: 多くのプロジェクトで実績あり
3. **アクティブなメンテナンス**: 定期的なセキュリティアップデート
4. **オープンソース**: コードが公開されており、監査可能

### 使用しているVite関連パッケージ

- `vite@^5.0.8` - コアパッケージ（公式）
- `@vitejs/plugin-react@^4.2.1` - 公式Reactプラグイン

これらはすべて公式パッケージで、セキュリティリスクは低いです。

### セキュリティ対策

1. **依存関係の定期的な更新**
   ```bash
   pnpm update
   ```

2. **脆弱性の監査**
   ```bash
   pnpm audit
   ```

3. **ロックファイルの確認**
   - `pnpm-lock.yaml`をコミットして、依存関係を固定

4. **信頼できるパッケージのみ使用**
   - 公式パッケージを優先
   - ダウンロード数の多いパッケージを優先
   - メンテナンスが活発なパッケージを優先

## 依存関係の確認

### 現在の依存関係

#### 本番依存関係（すべて信頼できるパッケージ）
- `react` - Meta（Facebook）公式
- `react-dom` - Meta（Facebook）公式
- `react-router-dom` - Remix公式
- `@shopify/polaris` - Shopify公式
- `@shopify/polaris-icons` - Shopify公式
- `zustand` - 人気の状態管理ライブラリ（GitHub 40k+ stars）
- `react-hook-form` - 人気のフォームライブラリ（GitHub 40k+ stars）
- `zod` - 型安全なバリデーション（GitHub 30k+ stars）
- `@hookform/resolvers` - react-hook-form公式

#### 開発依存関係
- `vite` - 公式
- `@vitejs/plugin-react` - 公式
- `typescript` - Microsoft公式
- `eslint` - 公式
- その他の型定義パッケージ - 公式

すべて信頼できるパッケージです。

## ベストプラクティス

1. **定期的な更新**
   - 月1回程度、依存関係を更新
   - セキュリティパッチは即座に適用

2. **ロックファイルの管理**
   - `pnpm-lock.yaml`を必ずコミット
   - 本番環境ではロックファイルを使用

3. **監査の実施**
   ```bash
   pnpm audit
   ```

4. **信頼できないパッケージの回避**
   - ダウンロード数が少ないパッケージは避ける
   - 最終更新が古いパッケージは避ける
   - レビューが少ないパッケージは避ける

5. **環境変数の管理**
   - `.env`ファイルは絶対にコミットしない
   - 機密情報は環境変数で管理

## トラブルシューティング

### pnpmがインストールされていない

```bash
# macOS
brew install pnpm

# その他
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 依存関係のインストールエラー

```bash
# キャッシュをクリア
pnpm store prune

# 再インストール
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### セキュリティ監査で問題が見つかった場合

```bash
# 監査を実行
pnpm audit

# 自動修正（可能な場合）
pnpm audit --fix
```

## 参考資料

- [pnpm公式サイト](https://pnpm.io/)
- [Vite公式サイト](https://vitejs.dev/)
- [npmセキュリティベストプラクティス](https://docs.npmjs.com/security-best-practices)

