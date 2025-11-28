# AGENT.md - BtoB受発注プラットフォーム

## プロジェクト概要

製造業向けBtoB受発注システム。得意先がオンラインで注文し、製造側が進捗管理から納品書発行までを一元管理する。

### ターゲット
- 製造業のBtoB取引
- Shopifyで商品管理している事業者
- 一般販売を視野に入れた汎用設計

---

## 技術スタック

### バックエンド
- ランタイム: Deno
- フレームワーク: Hono
- バリデーション: Zod
- デプロイ: Deno Deploy

### フロントエンド
- フレームワーク: React + Vite
- UIライブラリ: Shopify Polaris
- 状態管理: Zustand
- フォーム: React Hook Form + Zod
- デプロイ: Deno Deploy

### データベース
- Supabase (PostgreSQL)
- ORM: Supabase Client

### 外部連携
- Shopify API: @shopify/shopify-api
- PDF生成: Puppeteer
- 通知: Slack / LINE連携

---

## ユーザー種別

### 1. 管理者（製造側）
- 全体管理権限
- 得意先の登録・管理
- 全注文の閲覧・ステータス管理
- 製造進捗管理
- 帳票発行（納品書・請求書・ラベル）
- 在庫管理（Shopify連携）
- 材料在庫管理

### 2. 得意先（発注側）
- 自社専用アカウントでログイン
- 商品一覧・検索
- カート機能・注文確定
- 自社の注文履歴・ステータス確認

---

## 業務フロー

```
【得意先】
1. ログイン
2. 商品検索・閲覧
3. カートに追加
4. 注文確定
   ↓
【管理者】通知（Slack/LINE）
5. 注文確認
6. ステータス「製造中」に変更
   ↓
【得意先】ステータス更新を確認可能
   ↓
【管理者】
7. 製造完了 → ステータス「製造完了」
   → Shopify在庫 +（完成品が増える）
8. 納品書・ラベル発行ボタンでPDF生成
9. 出荷 → ステータス「出荷済み」
   → Shopify在庫 -（出荷分を減らす）
   ↓
【得意先】ステータス「出荷済み」を確認
```

---

## 機能一覧

### MVP（Phase 1）

#### 得意先ポータル
- [ ] ログイン・ログアウト
- [ ] 商品一覧表示
- [ ] 商品検索（商品名、SKU、カテゴリ）
- [ ] 商品詳細表示
- [ ] カート機能（追加・削除・数量変更）
- [ ] 注文確定
- [ ] 注文履歴一覧
- [ ] 注文詳細・ステータス確認

#### 管理者：受注管理
- [ ] 注文一覧（全得意先）
- [ ] 注文詳細表示
- [ ] ステータス変更（新規→製造中→製造完了→出荷済み）
- [ ] 検索・フィルター（得意先別、日付別、ステータス別）
- [ ] 「製造完了」でShopify在庫+
- [ ] 「出荷済み」でShopify在庫-

#### 管理者：帳票発行
- [ ] 納品書PDF生成
- [ ] 請求書PDF生成
- [ ] ラベルPDF生成（A4用紙22面シール）

#### 管理者：得意先管理
- [ ] 得意先一覧
- [ ] 得意先登録・編集・削除
- [ ] 請求方式設定（都度 / 掛売）
- [ ] ログインアカウント発行

#### 管理者：在庫管理
- [ ] Shopify商品一覧表示
- [ ] 在庫数表示
- [ ] 在庫数の手動編集（Shopifyに反映）

#### 管理者：材料在庫管理
- [ ] 材料マスタ登録・編集・削除（無制限）
- [ ] 入庫登録（手動）
- [ ] 出庫登録（手動）
- [ ] 現在在庫表示
- [ ] 入出庫履歴一覧

#### 通知
- [ ] 新規注文時 → Slack/LINE通知
- [ ] ステータス変更時 → 得意先に通知

### Phase 2（将来拡張）
- [ ] BOM（部品表）管理
- [ ] 製造時の材料自動引き当て
- [ ] 仕入れ先マスタ管理
- [ ] 発注書発行
- [ ] 棚卸機能（頻度: 毎月/四半期/年1回/なし 選択可能）
- [ ] 安全在庫アラート
- [ ] 原価計算
- [ ] 売上レポート・分析

---

## データベース設計

### テーブル一覧

#### shops（ストア/管理者）
- id: UUID, PK
- shop_domain: TEXT（Shopifyドメイン）
- access_token: TEXT（Shopify APIトークン）
- company_name: TEXT
- address: TEXT
- phone: TEXT
- invoice_number: TEXT（インボイス登録番号）
- created_at: TIMESTAMPTZ

#### customers（得意先）
- id: UUID, PK
- shop_id: UUID, FK → shops
- company_name: TEXT
- address: TEXT
- phone: TEXT
- email: TEXT
- billing_type: TEXT（'immediate' / 'credit'）都度/掛売
- login_id: TEXT
- password_hash: TEXT
- created_at: TIMESTAMPTZ

#### products（商品キャッシュ - Shopifyから同期）
- id: BIGINT, PK（Shopify Product ID）
- shop_id: UUID, FK → shops
- title: TEXT
- sku: TEXT
- price: DECIMAL
- inventory_quantity: INTEGER
- image_url: TEXT
- synced_at: TIMESTAMPTZ

#### orders（注文）
- id: UUID, PK
- shop_id: UUID, FK → shops
- customer_id: UUID, FK → customers
- order_number: TEXT（自動採番）
- status: TEXT（'new' / 'manufacturing' / 'completed' / 'shipped'）
- total_amount: DECIMAL
- notes: TEXT
- ordered_at: TIMESTAMPTZ
- shipped_at: TIMESTAMPTZ

#### order_items（注文明細）
- id: UUID, PK
- order_id: UUID, FK → orders
- product_id: BIGINT, FK → products
- product_name: TEXT
- sku: TEXT
- quantity: INTEGER
- unit_price: DECIMAL
- subtotal: DECIMAL

#### materials（材料マスタ）
- id: UUID, PK
- shop_id: UUID, FK → shops
- name: TEXT
- code: TEXT
- unit: TEXT（kg, 本, L, m など）
- current_stock: DECIMAL
- safety_stock: DECIMAL
- unit_price: DECIMAL
- created_at: TIMESTAMPTZ

#### material_transactions（材料入出庫履歴）
- id: UUID, PK
- material_id: UUID, FK → materials
- type: TEXT（'in' / 'out'）
- quantity: DECIMAL
- date: DATE
- order_id: UUID, FK → orders（出庫時の関連注文）
- notes: TEXT
- created_at: TIMESTAMPTZ

#### documents（発行済み帳票）
- id: UUID, PK
- order_id: UUID, FK → orders
- type: TEXT（'delivery_note' / 'invoice' / 'label'）
- document_number: TEXT（帳票番号）
- pdf_url: TEXT
- generated_at: TIMESTAMPTZ

---

## 帳票仕様

### 納品書
- 得意先: 会社名、住所
- 注文番号
- 注文日、納品日
- 商品明細: 商品名、SKU、数量、単価、小計
- 合計金額
- 自社情報: 会社名、住所、電話番号
- 備考欄
- 印鑑欄
- インボイス登録番号

### 請求書
- 納品書と同等の情報
- 支払条件（都度/掛売に応じて）
- 振込先情報

### ラベル
- 商品名
- SKU
- バーコード
- 商品写真
- 用紙: A4（22面シール）

---

## API設計方針

### エンドポイント構成
```
/api/auth/*        - 認証
/api/customers/*   - 得意先管理
/api/products/*    - 商品（Shopify連携）
/api/orders/*      - 受注管理
/api/materials/*   - 材料在庫管理
/api/documents/*   - 帳票生成
/api/notifications/* - 通知
```

### 認証
- 管理者: Shopify OAuth
- 得意先: ID/パスワード認証 + JWT

---

## Shopify連携

### 使用API
- Products API: 商品データ取得
- Inventory API: 在庫数の取得・更新

### 同期方針
- 商品データ: 定期同期 + 手動同期ボタン
- 在庫更新: 製造完了時に+、出荷時に-

---

## 通知連携

### Slack
- Webhook URLを設定
- 新規注文時に通知

### LINE
- LINE Notify または LINE Messaging API
- 新規注文時に通知
- 得意先へのステータス変更通知

---

## 開発フェーズ

### Phase 1: MVP
1. プロジェクトセットアップ（Deno + Supabase）
2. 認証基盤（Shopify OAuth + 得意先ログイン）
3. 商品データ同期（Shopify → Supabase）
4. 得意先ポータル（商品閲覧・注文）
5. 受注管理（ステータス管理）
6. 帳票生成（納品書・請求書・ラベル）
7. 材料在庫管理（基本機能）
8. 通知連携（Slack/LINE）

### Phase 2: 拡張
- BOM管理
- 仕入れ先管理
- 棚卸機能
- レポート機能

---

## コーディング規約

### 全般
- TypeScript strict mode
- 関数型アプローチを優先
- エラーハンドリングを徹底

### 命名規則
- ファイル: kebab-case（例: order-service.ts）
- 関数: camelCase（例: getOrderById）
- 型/インターフェース: PascalCase（例: OrderItem）
- 定数: UPPER_SNAKE_CASE（例: MAX_RETRY_COUNT）

### ディレクトリ構成（参考）
```
/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   └── deno.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── utils/
│   └── package.json
└── AGENT.md
```

---

## 環境変数

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Shopify
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=

# 通知
SLACK_WEBHOOK_URL=
LINE_CHANNEL_ACCESS_TOKEN=

# その他
JWT_SECRET=
```

---

## 注意事項

- Shopifyをマスタとし、商品の二重管理を避ける
- 価格は全得意先共通
- 材料在庫とShopify在庫は別管理
- 日本語UIのみ対応
- インボイス制度対応必須
